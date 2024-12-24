import { config } from "@/config";
import { logger } from "@/logger";
import { onStreamOffline, onStreamOnline } from "./websocket";

const CLIENT_ID = config.twitch.clientId
const CLIENT_SECRET = config.twitch.clientSecret
let OAUTH_TOKEN = ""; // Le token sera mis à jour dynamiquement
let tokenExpiryTime = 0; // Timestamp when the token expires

const streamerList = ["wiibleyde","antoinedaniel", "otplol_"];
const refreshInterval = 5000; // Intervalle en millisecondes (5 secondes)

export let onlineStreamers: StreamData[] = [];

interface OAuthResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface StreamPagination {
    cursor: string;
}

export interface StreamData {
    id: string;
    user_id: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    tags: string[];
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: string[];
    is_mature: boolean;
}

export interface StreamResponse {
    data: StreamData[];
    pagination: StreamPagination;
}

// Fonction pour récupérer le token OAuth
async function getOAuthToken(): Promise<OAuthResponse | null> {
    const url = "https://id.twitch.tv/oauth2/token";
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
    });

    try {
        const response = await fetch(url, {
            method: "POST",
            body: params,
        });
        const data: OAuthResponse = await response.json();
        OAUTH_TOKEN = data.access_token;
        tokenExpiryTime = Date.now() + data.expires_in * 1000; // Set token expiry time
        return data;
    } catch (error) {
        logger.error("Erreur lors de la récupération du token OAuth :", error);
        return null;
    }
}

// Fonction pour vérifier si un streamer est en direct
async function areStreamersLive(): Promise<StreamData[]> {
    // Refresh the token if it has expired
    if (Date.now() >= tokenExpiryTime) {
        await getOAuthToken();
    }
    const theUrl = `https://api.twitch.tv/helix/streams?${generateUrlParams()}`;
    const headers = {
        "Client-Id": CLIENT_ID,
        "Authorization": `Bearer ${OAUTH_TOKEN}`,
    };

    try {
        const response = await fetch(theUrl, { headers });
        const data: StreamResponse = await response.json();
        const liveStreamers = data.data;
        return liveStreamers;
    } catch (error) {
        logger.error("Erreur lors de la récupération des streamers en direct :", error);
        return [];
    }
}

// Fonction pour générer les paramètres de l'URL
function generateUrlParams() {
    return streamerList.map((streamer) => `user_login=${streamer}`).join("&");
}

// Fonction pour démarrer l'auto-refresh
export async function startAutoRefresh() {
    await getOAuthToken();
    onlineStreamers = await areStreamersLive();
    logger.debug("Streamers en direct :", onlineStreamers);
    setInterval(async () => {
        const oldStreamers = onlineStreamers;
        onlineStreamers = await areStreamersLive();
        const missingStreamers = oldStreamers.filter((oldStream) => !onlineStreamers.some((stream) => stream.user_name === oldStream.user_name));
        const newStreamers = onlineStreamers.filter((stream) => !oldStreamers.some((oldStream) => oldStream.user_name === stream.user_name));
        for (const streamer of missingStreamers) {
            logger.info(`Le stream de ${streamer.user_name} est offline.`);
            onStreamOffline(streamer);
        }
        for (const streamer of newStreamers) {
            logger.info(`Le stream de ${streamer.user_name} est online.`);
            onStreamOnline(streamer);
        }
    }, refreshInterval);
}
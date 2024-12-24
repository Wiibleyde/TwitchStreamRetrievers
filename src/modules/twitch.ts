import { config } from "@/config";
import { logger } from "@/logger";
import { webSocketService } from "./websocket";

const CLIENT_ID = config.twitch.clientId;
const CLIENT_SECRET = config.twitch.clientSecret;

class TwitchService {
    private OAUTH_TOKEN = ""; // Le token sera mis à jour dynamiquement
    private tokenExpiryTime = 0; // Timestamp when the token expires
    private streamerList = ["wiibleyde", "antoinedaniel", "otplol_"];
    private refreshInterval = 5000; // Intervalle en millisecondes (5 secondes)
    public onlineStreamers: StreamData[] = [];

    constructor() {
        this.startAutoRefresh();
    }

    private async getOAuthToken(): Promise<OAuthResponse | null> {
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
            this.OAUTH_TOKEN = data.access_token;
            this.tokenExpiryTime = Date.now() + data.expires_in * 1000; // Set token expiry time
            return data;
        } catch (error) {
            logger.error("Erreur lors de la récupération du token OAuth :", error);
            return null;
        }
    }

    private async areStreamersLive(): Promise<StreamData[]> {
        // Refresh the token if it has expired
        if (Date.now() >= this.tokenExpiryTime) {
            await this.getOAuthToken();
        }
        const theUrl = `https://api.twitch.tv/helix/streams?${this.generateUrlParams()}`;
        const headers = {
            "Client-Id": CLIENT_ID,
            "Authorization": `Bearer ${this.OAUTH_TOKEN}`,
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

    private generateUrlParams(): string {
        return this.streamerList.map((streamer) => `user_login=${streamer}`).join("&");
    }

    private async startAutoRefresh(): Promise<void> {
        await this.getOAuthToken();
        this.onlineStreamers = await this.areStreamersLive();
        logger.debug("Streamers en direct :", this.onlineStreamers.map((stream) => stream.user_name).join(", "));
        setInterval(async () => {
            const oldStreamers = this.onlineStreamers;
            this.onlineStreamers = await this.areStreamersLive();
            const missingStreamers = oldStreamers.filter((oldStream) => !this.onlineStreamers.some((stream) => stream.user_name === oldStream.user_name));
            const newStreamers = this.onlineStreamers.filter((stream) => !oldStreamers.some((oldStream) => oldStream.user_name === stream.user_name));
            for (const streamer of missingStreamers) {
                logger.info(`Le stream de ${streamer.user_name} est offline.`);
                webSocketService.onStreamOffline(streamer);
            }
            for (const streamer of newStreamers) {
                logger.info(`Le stream de ${streamer.user_name} est online.`);
                webSocketService.onStreamOnline(streamer);
            }
        }, this.refreshInterval);
    }
}

export const twitchService = new TwitchService();

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
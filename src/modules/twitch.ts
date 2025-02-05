import { config } from "@/config";
import { logger } from "@/logger";
import { webSocketService } from "./websocket";
import { streamerList } from "..";

const CLIENT_ID = config.twitch.clientId;
const CLIENT_SECRET = config.twitch.clientSecret;

class TwitchService {
    private OAUTH_TOKEN = ""; // Le token sera mis à jour dynamiquement
    private tokenExpiryTime = 0; // Timestamp when the token expires
    private refreshInterval = 5000; // Intervalle en millisecondes (5 secondes)
    public onlineStreamers: StreamData[] = [];
    public offlineStreamDatas: OfflineStreamData[] = [];

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

    private async getOfflineStreamsData(): Promise<OfflineStreamData[]> {
        if (Date.now() >= this.tokenExpiryTime) {
            await this.getOAuthToken();
        }
        const url = `https://api.twitch.tv/helix/users?${this.generateOfflineUrlParams()}`;
        const headers = {
            "Client-Id": CLIENT_ID,
            "Authorization": `Bearer ${this.OAUTH_TOKEN}`,
        };

        try {
            const response = await fetch(url, { headers });
            const data: OfflineStreamResponse = await response.json();
            const offlineStreamers = data.data;
            return offlineStreamers;
        } catch (error) {
            logger.error("Erreur lors de la récupération des streamers hors ligne :", error);
            return [];
        }
    }

    public getOfflineStreamData(login: string): OfflineStreamData | undefined {
        return this.offlineStreamDatas.find((streamer) => streamer.login === login.toLowerCase());
    }

    private generateUrlParams(): string {
        return streamerList.getStreamers().map((streamer) => `user_login=${streamer}`).join("&");
    }

    private generateOfflineUrlParams(): string {
        return streamerList.getStreamers().map((streamer) => `login=${streamer}`).join("&");
    }

    private async startAutoRefresh(): Promise<void> {
        await this.getOAuthToken();
        this.onlineStreamers = await this.areStreamersLive();
        this.offlineStreamDatas = await this.getOfflineStreamsData();
        setInterval(async () => {
            const oldStreamers = this.onlineStreamers;
            this.offlineStreamDatas = await this.getOfflineStreamsData();
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

export interface OfflineStreamData {
    id: string,
    login: string,
    display_name: string,
    type: string
    broadcaster_type: string,
    description: string,
    profile_image_url: string,
    offline_image_url: string
    view_count: number
    email?: string
    created_at: string
}

export interface StreamResponse {
    data: StreamData[];
    pagination: StreamPagination;
}

export interface OfflineStreamResponse {
    data: OfflineStreamData[];
}
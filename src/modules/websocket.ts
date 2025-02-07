import { logger } from "@/logger";
import { WebSocket, WebSocketServer } from "ws";
import { twitchService, StreamData, OfflineStreamData } from "./twitch";
import { config } from "@/config";
import { verifyToken } from "@/auth";
import { streamerList } from "..";
import { StreamerListErrors } from "./streamerList";

enum WebSocketMessageType {
    MESSAGE = "MESSAGE",
    STREAMS = "STREAMS",
    NEW_STREAM_ONLINE = "NEW_STREAM_ONLINE",
    NEW_STREAM_OFFLINE = "STREAM_OFFLINE",
    ASK_STREAMS = "ASK_STREAMS",
    ADD_STREAM = "ADD_STREAM",
}

interface WebSocketMessage {
    type: WebSocketMessageType;
    payload: any;
}

export class WebSocketService {
    private wss!: WebSocketServer;

    constructor(private port: number) {}

    public start(): void {
        logger.info("Initialisation du serveur WebSocket");

        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on("listening", () => {
            logger.info(`WebSocket server listening on port ${this.port}`);
        });

        this.wss.on("connection", (ws, req) => {
            const token = req.url?.split("token=")[1];
            if (!token || !verifyToken(token)) {
                ws.close(1008, "Invalid or missing token");
                logger.warn("Connexion refusée : token invalide ou manquant");
                return;
            }

            logger.info("Nouvelle connexion");
            const offlineStreams = twitchService.offlineStreamDatas.filter((offlineStreamData) => {
                return !twitchService.onlineStreamers.some((onlineStreamer) => onlineStreamer.user_name.toLowerCase() === offlineStreamData.login);
            });
            logger.debug("Offline streams", offlineStreams.map((stream) => stream.login).join(", "));
            const message: WebSocketMessage = {
                type: WebSocketMessageType.STREAMS,
                payload: {
                    online: twitchService.onlineStreamers,
                    offline: offlineStreams,
                    offlineData: twitchService.offlineStreamDatas,
                },
            };
            ws.send(JSON.stringify(message));

            ws.on("close", () => {
                logger.info("Déconnexion");
            });

            ws.on("message", (message) => {
                const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
                this.onMessage(ws, parsedMessage);
            });
        });

        this.wss.on("error", (error: { message: any; }) => {
            logger.error(`WebSocket server error: ${error.message}`);
        });

        logger.info(`WebSocket server started on port ${this.port}`);
    }

    private onMessage(ws: WebSocket, message: WebSocketMessage): void {
        switch (message.type) {
            case WebSocketMessageType.MESSAGE:
                logger.info("Message reçu :", message.payload);
                break;
            case WebSocketMessageType.ASK_STREAMS:
                const streamsMessage: WebSocketMessage = {
                    type: WebSocketMessageType.STREAMS,
                    payload: twitchService.onlineStreamers,
                };
                this.send(streamsMessage, ws);
                break;
            case WebSocketMessageType.ADD_STREAM:
                const success = streamerList.addStreamer(message.payload);
                if(success === StreamerListErrors.UNKNOWN) {
                    if(twitchService.onlineStreamers.some((stream) => stream.user_name.toLowerCase() === message.payload)) {
                        this.onStreamOnline(twitchService.getStreamData(message.payload) as StreamData);
                    } else {
                        this.onStreamOffline(twitchService.getStreamData(message.payload) as StreamData);
                    }
                }
                break;
            default:
                logger.warn("Message non géré :", JSON.stringify(message));
                break;
        }
    }

    private send(message: WebSocketMessage, ws: WebSocket): void {
        ws.send(JSON.stringify(message));
    }

    public broadcast(message: string): void {
        this.wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }

    public onStreamOnline(streamData: StreamData): void {
        const offlineStreamData = twitchService.getOfflineStreamData(streamData.user_name);
        logger.debug("Offline stream data", offlineStreamData);
        const message: WebSocketMessage = {
            type: WebSocketMessageType.NEW_STREAM_ONLINE,
            payload: {
                online: streamData,
                offline: offlineStreamData,
            }
        };

        this.broadcast(JSON.stringify(message));
    }

    public onStreamOffline(streamData: StreamData): void {
        const offlineStreamData = twitchService.getOfflineStreamData(streamData.user_name);
        const message: WebSocketMessage = {
            type: WebSocketMessageType.NEW_STREAM_OFFLINE,
            payload: {
                online: streamData,
                offline: offlineStreamData,
            }
        };

        this.broadcast(JSON.stringify(message));
    }

    public getClients(): Set<WebSocket> {
        return this.wss.clients;
    }
}

export const webSocketService = new WebSocketService(config.websocket.port);

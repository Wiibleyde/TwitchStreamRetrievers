import { logger } from "@/logger";
import { WebSocket, WebSocketServer } from "ws";
import { onlineStreamers, StreamData } from "./twitch";

let wss: WebSocketServer;

enum WebSocketMessageType {
    MESSAGE = "MESSAGE",
    STREAMS = "STREAMS",
    NEW_STREAM_ONLINE = "NEW_STREAM_ONLINE",
    NEW_STREAM_OFFLINE = "STREAM_OFFLINE",
    ASK_STREAMS = "ASK_STREAMS",
    ASK_STREAM = "ASK_STREAM",
}

interface WebSocketMessage {
    type: WebSocketMessageType;
    payload: any;
}

export function startWebsocket(port: number): void {
    logger.info("Initialisation du serveur WebSocket");

    wss = new WebSocketServer({ port: port });

    wss.on("listening", () => {
        logger.info("WebSocket server listening on port", port);
    });

    wss.on("connection", (ws) => {
        logger.info("Nouvelle connexion");
        const message: WebSocketMessage = {
            type: WebSocketMessageType.STREAMS,
            payload: onlineStreamers,
        };

        ws.send(JSON.stringify(message));

        ws.on("close", () => {
            logger.info("Déconnexion");
        });

        ws.on("message", (message) => {
            const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
            onMessage(ws, parsedMessage);
        });
    });

    wss.on("error", (error: { message: any; }) => {
        logger.error(`WebSocket server error: ${error.message}`);
    });
}

function onMessage(ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
        case WebSocketMessageType.MESSAGE:
            logger.info("Message reçu :", message.payload);
            break;
        case WebSocketMessageType.ASK_STREAMS:
            const streamsMessage: WebSocketMessage = {
                type: WebSocketMessageType.STREAMS,
                payload: onlineStreamers,
            };
            send(streamsMessage, ws);
            break;
        case WebSocketMessageType.ASK_STREAM:
            const streamData = onlineStreamers.find((stream) => stream.user_name === message.payload);
            if (streamData) {
                const streamMessage: WebSocketMessage = {
                    type: WebSocketMessageType.STREAMS,
                    payload: streamData,
                };
                send(streamMessage, ws);
            } else {
                logger.warn("Stream introuvable :", message.payload);
                const errorMessage: WebSocketMessage = {
                    type: WebSocketMessageType.MESSAGE,
                    payload: `Stream introuvable : ${message.payload}`,
                };
                send(errorMessage, ws);
            }
            break;
        default:
            logger.warn("Message non géré :", JSON.stringify(message));
            break;
    }
}

export function onStreamOnline(streamData: StreamData): void {
    const message: WebSocketMessage = {
        type: WebSocketMessageType.NEW_STREAM_ONLINE,
        payload: streamData,
    };

    broadcast(JSON.stringify(message));
}

export function onStreamOffline(streamData: StreamData): void {
    const message: WebSocketMessage = {
        type: WebSocketMessageType.NEW_STREAM_OFFLINE,
        payload: streamData,
    };

    broadcast(JSON.stringify(message));
}

function send(message: WebSocketMessage, ws: WebSocket): void {
    ws.send(JSON.stringify(message));
}

export function broadcast(message: string): void {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

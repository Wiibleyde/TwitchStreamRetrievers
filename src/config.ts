import dotenv from "dotenv";

dotenv.config();

const { CLIENT_ID, CLIENT_SECRET, WEBSERVER_PORT, WEBSOCKET_PORT } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !WEBSERVER_PORT || !WEBSOCKET_PORT) {
    throw new Error("Variables d'environnement manquantes");
}

export const config = {
    twitch: {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
    },
    webserver: {
        port: parseInt(WEBSERVER_PORT, 10),
    },
    websocket: {
        port: parseInt(WEBSOCKET_PORT, 10),
    },
    auth: {
        token: process.env.AUTH_TOKEN || "default_token",
    },
};
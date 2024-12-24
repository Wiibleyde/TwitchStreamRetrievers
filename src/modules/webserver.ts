import express, { Request, Response } from "express";
import { onlineStreamers } from "./twitch";
import { logger } from "@/logger";

const app = express();

const DEFAULT_PATH = "/api/v1";

interface ApiResponse {
    message: string;
    data?: any;
    error?: string;
}

app.get("/", (req: Request, res: Response) => {
    const response: ApiResponse = {
        message: "Yo.",
    };
    res.send(response);
});

app.get(`${DEFAULT_PATH}/`, (req: Request, res: Response) => {
    const response: ApiResponse = {
        message: "Bienvenue sur l'API v1",
    };
    res.send(response);
})

app.get(`${DEFAULT_PATH}/streamers`, (req: Request, res: Response) => {
    const response: ApiResponse = {
        message: "Liste des streamers",
        data: onlineStreamers,
    };
    res.send(response);
});

export function startWebServer(port: number): void {
    app.listen(port, () => {
        logger.info(`Serveur web démarré sur le port ${port}`);
    });
}
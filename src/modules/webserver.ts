import express, { Request, Response } from "express";
import { twitchService } from "./twitch";
import { logger } from "@/logger";
import { verifyToken } from "@/auth"; // Import the token verification function

const DEFAULT_PATH = "/api/v1";

interface ApiResponse {
    message: string;
    data?: any;
    error?: string;
}

export class WebServer {
    private app = express();

    constructor(private port: number) {
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.app.use((req: Request, res: Response, next) => {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token || !verifyToken(token)) {
                res.status(401).send({ message: "Unauthorized" });
                logger.warn("Requête non autorisée");
                return;
            }
            next();
        });

        this.app.get("/", (req: Request, res: Response) => {
            const response: ApiResponse = {
                message: "Yo.",
            };
            res.send(response);
        });

        this.app.get(`${DEFAULT_PATH}/`, (req: Request, res: Response) => {
            const response: ApiResponse = {
                message: "Bienvenue sur l'API v1",
            };
            res.send(response);
        });

        this.app.get(`${DEFAULT_PATH}/streamers`, (req: Request, res: Response) => {
            const response: ApiResponse = {
                message: "Liste des streamers",
                data: twitchService.onlineStreamers,
            };
            res.send(response);
        });
    }

    public start(): void {
        this.app.listen(this.port, () => {
            logger.info(`Serveur web démarré sur le port ${this.port}`);
        });
    }
}
import { config } from "./config";
import { logger } from "./logger";
import { twitchService } from "./modules/twitch";
import { WebServer } from "./modules/webserver";
import readline from "node:readline";
import { webSocketService } from "./modules/websocket"; // Import the existing instance

export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "twitch-stream-retriever> ",
});

twitchService; // Initialize TwitchService

const webServer = new WebServer(config.webserver.port);

webServer.start();
webSocketService.start(); // Use the existing instance

process.on("SIGINT", () => {
    logger.warn("Arrêt du programme...");
    rl.close();
});

rl.on("close", () => {
    process.exit(0);
});

rl.prompt();

enum Commands {
    EXIT = "exit",
    QUIT = "quit",
    STREAMERS = "streamers",
    HELP = "help",
}

rl.on("line", (line) => {
    const command = line.trim().toLowerCase();

    switch (command) {
        case Commands.EXIT:
        case Commands.QUIT:
            process.kill(process.pid, "SIGINT");
            break;
        case Commands.STREAMERS:
            logger.info("Streamers en direct :", twitchService.onlineStreamers.map((stream) => stream.user_name).join(", "));
            break;
        case Commands.HELP:
            logger.info("Commandes disponibles :");
            logger.info("- exit, quit : Quitter l'application");
            logger.info("- streamers : Afficher la liste des streamers en direct");
            break;
        default:
            logger.warn("Commande inconnue :", command);
            logger.info("Tapez 'help' pour afficher la liste des commandes disponibles");
            break;
    }
});
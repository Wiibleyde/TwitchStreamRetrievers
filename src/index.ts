import { config } from "./config";
import { logger } from "./logger";
import { startAutoRefresh } from "./modules/twitch";
import { startWebServer } from "./modules/webserver";
import readline from "node:readline";
import { startWebsocket } from "./modules/websocket";

export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "twitch-stream-retriever> ",
});

startAutoRefresh();
startWebServer(config.webserver.port);
startWebsocket(config.websocket.port);

process.on("SIGINT", () => {
    logger.warn("Arrêt du programme...");
    rl.close();
});


rl.on("close", () => {
    process.exit(0);
});

rl.prompt();

rl.on("line", (line) => {
    const command = line.trim().toLowerCase();

    switch (command) {
        case "exit":
            process.kill(process.pid, "SIGINT");
            break;
        default:
            logger.warn("Commande inconnue :", command);
            break;
    }
});
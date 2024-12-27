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
    CLIENTS = "clients",
}

const commands = Object.values(Commands);

rl.on("line", (line) => {
    const command = line.trim().toLowerCase();

    if(command === "") {
        rl.prompt();
        return;
    }

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
        case Commands.CLIENTS:
            logger.info("Clients connectés :", webSocketService.getClients().size);
            break;
        default:
            logger.warn("Commande inconnue :", command);
            logger.info("Tapez 'help' pour afficher la liste des commandes disponibles");
            break;
    }
});

rl.on("tab", (line) => {
    const hits = commands.filter((c) => c.startsWith(line.trim().toLowerCase()));
    if (hits.length === 1) {
        rl.write(null, { ctrl: true, name: "u" });
        rl.write(hits[0]);
        rl.prompt(true);
    } else if (hits.length > 1) {
        logger.info("Suggestions :", hits.join(", "));
        rl.prompt();
    } else {
        rl.prompt();
    }
});

(rl as any).input.on("keypress", (char: string, key: { name: string }) => {
    if (key && key.name === "tab") {
        const line = rl.line.trim().toLowerCase();
        const hits = commands.filter((c) => c.startsWith(line));
        if (hits.length === 0) {
            return false; // Prevent tab character if no suggestions are found
        }
        rl.emit("tab", rl.line);
    }
});
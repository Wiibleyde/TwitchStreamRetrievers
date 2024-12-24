import readline from "node:readline"; // Import readline
import { rl } from ".";

const resetColor = "\x1b[0m"

enum LogLevelColors {
    ERROR = "\x1b[31m",
    INFO = "\x1b[36m",
    WARN = "\x1b[33m",
    DEBUG = "\x1b[32m",
}

class Logger {
    private getNowDate(): string {
        const now = new Date()
        return now.toLocaleString()
    }

    private formatMessage(messageList: unknown[]): string {
        return messageList.join(" ").substring(0, 1950)
    }

    private logWithClear(logFunction: (message: string) => void, color: string, level: string, messageList: unknown[]): void {
        const message = this.formatMessage(messageList);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        logFunction(color + `[${level}] ${this.getNowDate()} : ${message}` + resetColor);
        rl.prompt(true);
    }

    public async info(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.log, LogLevelColors.INFO, "INFO", messageList);
    }

    public async error(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.error, LogLevelColors.ERROR, "ERROR", messageList);
    }

    public async warn(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.warn, LogLevelColors.WARN, "WARN", messageList);
    }

    public async debug(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.log, LogLevelColors.DEBUG, "DEBUG", messageList);
    }
}

export const logger = new Logger();
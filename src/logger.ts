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
    /**
     * Gets the current date and time as a localized string.
     *
     * @returns {string} The current date and time in a locale-specific format.
     */
    private getNowDate(): string {
        const now = new Date()
        return now.toLocaleString()
    }

    private formatMessage(messageList: unknown[]): string {
        return messageList.join(" ").substring(0, 1950)
    }

    private logWithClear(logFunction: (message: string) => void, color: string, level: string, messageList: unknown[]): void {
        const message = this.formatMessage(messageList);
        readline.clearLine(process.stdout, 0); // Clear the current line
        readline.cursorTo(process.stdout, 0); // Move the cursor to the start of the line
        logFunction(color + `[${level}] ${this.getNowDate()} ${message}` + resetColor + "\n");
        rl.prompt(true); // Re-display the prompt
    }

    /**
     * Logs an informational message to the console, optionally to Discord and a database.
     *
     * @param {...Array<unknown>} messageList - The list of messages to log.
     * @returns {Promise<void>} A promise that resolves when the logging is complete.
     *
     * Logs the message to the console with an "INFO" level tag and a timestamp.
     */
    public async info(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.log, LogLevelColors.INFO, "INFO", messageList);
    }

    /**
     * Logs an error message to the console, optionally sends it to a Discord webhook, and stores it in a database.
     * 
     * @param {...Array<unknown>} messageList - The list of messages to log.
     * @returns {Promise<void>} A promise that resolves when the logging is complete.
     * 
     * @remarks
     * - The message is joined into a single string with spaces.
     * - The log is printed to the console with an error level.
     */
    public async error(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.error, LogLevelColors.ERROR, "ERROR", messageList);
    }

    /**
     * Logs a warning message to the console, optionally sends it to Discord and/or saves it to the database.
     * 
     * @param {...unknown[]} messageList - The list of messages to log.
     * @returns {Promise<void>} A promise that resolves when the logging is complete.
     * 
     * @remarks
     * - The message is joined into a single string with spaces.
     * 
     * @example
     * ```typescript
     * await logger.warn("This is a warning message", "with additional context");
     * ```
     */
    public async warn(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.warn, LogLevelColors.WARN, "WARN", messageList);
    }

    /**
     * Logs a debug message to the console, optionally to Discord via a webhook, and optionally to a database.
     * 
     * @param {...Array<unknown>} messageList - The list of messages to be logged.
     * @returns {Promise<void>} A promise that resolves when the logging is complete.
     * 
     * @remarks
     * - The message is joined into a single string with spaces.
     */
    public async debug(...messageList: unknown[]): Promise<void> {
        this.logWithClear(console.log, LogLevelColors.DEBUG, "DEBUG", messageList);
    }
}

export const logger = new Logger();

import { config } from "@/config";

export function verifyToken(token: string): boolean {
    // Implement your token verification logic here
    // For simplicity, we are just checking if the token matches a predefined value
    return token === config.auth.token;
}
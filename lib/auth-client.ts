import { createAuthClient } from "better-auth/react";

// Get the base URL from environment variable or fallback to localhost
const baseUrl = process.env.BETTER_AUTH_URL;

export const authClient = createAuthClient({
    baseURL: baseUrl,
});

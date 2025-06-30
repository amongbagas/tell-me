import { createAuthClient } from "better-auth/react";

// Get the base URL from environment variable or fallback to localhost
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const authClient = createAuthClient({
    baseURL: baseUrl,
});

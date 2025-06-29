"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { session } from "@/db/schema";
import { eq } from "drizzle-orm";

// Note: For login and signup, it's better to use client-side methods
// as they handle cookies automatically. Server actions have limitations
// with cookie setting in Next.js App Router.

const deleteUserSessions = async (userId: string) => {
    try {
        await db.delete(session).where(eq(session.userId, userId));
        return true;
    } catch (error) {
        console.error("Error deleting sessions:", error);
        return false;
    }
};

export const signOut = async () => {
    try {
        const currentSession = await auth.api.getSession({
            headers: await headers(),
        });

        if (currentSession?.user?.id) {
            await deleteUserSessions(currentSession.user.id);
        }

        await auth.api.signOut({
            headers: await headers(),
        });

        return {
            success: true,
            message: "Signed out successfully",
        };
    } catch (error) {
        const e = error as Error;
        return {
            success: false,
            message: e.message || "An error occurred during sign-out",
        };
    }
};

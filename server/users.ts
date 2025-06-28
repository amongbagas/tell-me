"use server";

import { auth } from "@/lib/auth";

export const signIn = async () => {
    await auth.api.signInEmail({
        body: {
            email: " axl@test.com",
            password: "admin123",
        },
    });
};

export const signUp = async () => {
    await auth.api.signUpEmail({
        body: {
            email: "axl@test.com",
            password: "admin123",
            name: "Marviz Axl",
        },
    });
};

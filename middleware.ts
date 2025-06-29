import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);
    const { pathname } = request.nextUrl;

    // If user is logged in and trying to access login/signup pages, redirect to dashboard
    if (
        sessionCookie &&
        (pathname === "/login" ||
            pathname === "/signup" ||
            pathname === "/forgot-password" ||
            pathname === "/reset-password")
    ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If user is not logged in and trying to access protected pages, redirect to home
    if (!sessionCookie && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
};

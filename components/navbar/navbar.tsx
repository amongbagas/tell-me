"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";
import { NavigationSheet } from "./navigation-sheet";
import ThemeToggle from "../theme-toggle";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const Navbar = () => {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    useEffect(() => {
        const checkSession = async () => {
            const session = await authClient.getSession();
            setIsLoggedIn(!!session?.data?.user);
        };
        checkSession();
    }, []);

    return (
        <nav className="fixed z-10 top-6 inset-x-4 h-14 xs:h-16 bg-background/50 backdrop-blur-sm border dark:border-slate-700/70 max-w-screen-xl mx-auto rounded-full">
            <div className="h-full flex items-center justify-between mx-auto px-4">
                <Logo />

                {/* Desktop Menu */}
                <NavMenu className="hidden md:block" />

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {isLoggedIn ? (
                        <Button
                            variant="outline"
                            className="hidden sm:inline-flex"
                            onClick={() => router.push("/dashboard")}
                        >
                            Dashboard
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                className="hidden sm:inline-flex"
                                onClick={() => router.push("/login")}
                            >
                                Sign In
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden xs:inline-flex"
                                onClick={() => router.push("/signup")}
                            >
                                Sign Up
                            </Button>
                        </>
                    )}

                    {/* Mobile Menu */}
                    <div className="md:hidden">
                        <NavigationSheet isLoggedIn={isLoggedIn} />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

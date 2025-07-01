"use client";

import { useEffect, useState } from "react";
import { NavUser } from "./nav-user";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
    const [user, setUser] = useState<{
        name?: string;
        email?: string;
        image?: string;
    } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const session = await authClient.getSession();
            const user = session?.data?.user
                ? {
                      name: session.data.user.name,
                      email: session.data.user.email,
                      image: session.data.user.image ?? undefined,
                  }
                : null;
            setUser(user);
        };
        fetchUser();
    }, []);

    const userData = {
        name: user?.name || "Guest",
        email: user?.email || "user@mail.com",
        avatar: user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=random`,
    };
    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2  ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 justify-end">
                <div className="flex items-center gap-2">
                    <NavUser user={userData} />
                </div>
            </div>
        </header>
    );
}

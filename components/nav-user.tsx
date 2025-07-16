"use client";

import { IconLogout } from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { signOut } from "@/server/users";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function NavUser({
    user,
}: {
    user: {
        name: string;
        email: string;
        avatar: string;
    };
}) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { isMobile } = useSidebar();

    const handleSignOut = async () => {
        setIsLoading(true);

        const { success, message } = await signOut();
        if (success) {
            toast.success(message as string);
            router.push("/");
        } else {
            toast.error(message as string);
        }

        setIsLoading(false);
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-lg my-2"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
                            <IconLogout />
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Logout"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

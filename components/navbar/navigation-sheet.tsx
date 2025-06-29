import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";
import { useRouter } from "next/navigation";

export const NavigationSheet = ({ isLoggedIn = false }: { isLoggedIn?: boolean }) => {
    const router = useRouter();
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                        Buka menu navigasi utama, lihat tautan, dan opsi masuk atau daftar.
                    </SheetDescription>
                </SheetHeader>
                <Logo />
                <NavMenu orientation="vertical" className="mt-12" />

                <div className="mt-8 space-y-4">
                    {isLoggedIn ? (
                        <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
                            Dashboard
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                className="w-full sm:hidden"
                                onClick={() => router.push("/login")}
                            >
                                Sign In
                            </Button>
                            <Button className="w-full xs:hidden" onClick={() => router.push("/signup")}>
                                Sign Up
                            </Button>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

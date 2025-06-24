import { InstagramIcon, FacebookIcon, TwitterIcon } from "lucide-react";
import Link from "next/link";

const Footer = () => {
    return (
        <footer className="border-t mt-40 bg-background text-foreground">
            <div className="max-w-screen-xl mx-auto">
                <div className="py-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-x-2 gap-y-5 px-6 xl:px-0">
                    {/* Copyright */}
                    <span className="text-muted-foreground text-center sm:text-start">
                        &copy; {new Date().getFullYear()}{" "}
                        <Link href="/" target="_blank">
                            Tell Me
                        </Link>
                        . All rights reserved.
                    </span>

                    <div className="flex items-center gap-5 text-muted-foreground">
                        <Link href="#" target="_blank">
                            <TwitterIcon className="h-5 w-5" />
                        </Link>
                        <Link href="#" target="_blank">
                            <InstagramIcon className="h-5 w-5" />
                        </Link>
                        <Link href="#" target="_blank">
                            <FacebookIcon className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

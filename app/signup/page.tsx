import { Logo } from "@/components/logo";
import Link from "next/link";
import { SignUpForm } from "@/components/forms/signup-form";

export default function SignUp() {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="#" className="flex items-center gap-2 self-center font-medium">
                    <div className="bg-secondary text-secondary-foreground flex size-6 items-center justify-center rounded-md">
                        <Logo className="size-4" />
                    </div>
                    Tell Me
                </Link>
                <SignUpForm />
            </div>
        </div>
    );
}

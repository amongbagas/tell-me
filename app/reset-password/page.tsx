import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Logo } from "@/components/logo";

function ResetPasswordFormWrapper() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            }
        >
            <ResetPasswordFormWithToken />
        </Suspense>
    );
}

function ResetPasswordFormWithToken() {
    return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="#" className="flex items-center gap-2 self-center font-medium">
                    <div className="bg-secondary text-secondary-foreground flex size-6 items-center justify-center rounded-md">
                        <Logo className="size-4" />
                    </div>
                    Tell Me
                </Link>
                <ResetPasswordFormWrapper />
            </div>
        </div>
    );
}

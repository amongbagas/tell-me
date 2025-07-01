import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VoiceCallSelector } from "@/components/voice-call-selector";
import { StarsBackground } from "@/components/animate-ui/backgrounds/stars";
import { SparklesText } from "@/components/magicui/sparkles-text";

export default function Page() {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <SidebarInset className="relative z-10 flex flex-col">
                <SiteHeader />
                {/* Header on top voice call selector on middle */}
                <div className="flex-1 flex items-center justify-center p-4 flex-col gap-y-5">
                    <SparklesText>Tell Me</SparklesText>
                    <VoiceCallSelector />
                </div>
            </SidebarInset>
            <div className="absolute inset-0 z-0">
                <StarsBackground />
            </div>
        </SidebarProvider>
    );
}

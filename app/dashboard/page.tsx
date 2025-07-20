import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VoiceCallSelector } from "@/components/voice-call-selector";
import { Particles } from "@/components/ui/particles";
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
                <Particles
                    className="w-full h-full"
                    quantity={100}
                    staticity={50}
                    ease={50}
                    size={0.4}
                    refresh={true}
                    color="#ffffff"
                    vx={0}
                    vy={0}
                />
            </div>
        </SidebarProvider>
    );
}

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VoiceCallSelector } from "@/components/voice-call-selector";

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
            <AppSidebar variant="inset" />
            <SidebarInset className="flex flex-col">
                <SiteHeader />
                <main className="flex-1 flex items-center justify-center p-4">
                    <VoiceCallSelector />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

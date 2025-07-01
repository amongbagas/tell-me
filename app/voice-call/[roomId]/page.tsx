import VoiceCallRoom from "./voice-call-room";

interface PageProps {
    params: Promise<{ roomId: string }>;
}

export default async function Page({ params }: PageProps) {
    const { roomId } = await params;
    return <VoiceCallRoom roomId={roomId} />;
}

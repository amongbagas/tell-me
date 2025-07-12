import VoiceCallRoomWebSocket from "./voice-call-room-websocket";

interface PageProps {
    params: Promise<{ roomId: string }>;
}

export default async function Page({ params }: PageProps) {
    const { roomId } = await params;
    return <VoiceCallRoomWebSocket roomId={roomId} />;
}

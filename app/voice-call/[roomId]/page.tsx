import VoiceCallRoom from "./voice-call-room";
import React from "react";

interface VoiceCallPageProps {
    params: {
        roomId: string;
    };
}

export default function Page({ params }: VoiceCallPageProps) {
    return <VoiceCallRoom roomId={params.roomId} />;
}

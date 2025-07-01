import VoiceCallRoom from "./voice-call-room";
import React from "react";

export default function Page({ params }: { params: { roomId: string } }) {
    return <VoiceCallRoom roomId={params.roomId} />;
}

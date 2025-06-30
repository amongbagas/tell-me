// app/voice-call/[roomId]/page.tsx
"use client";

import VoiceCallRoom from "./voice-call-room";
import React, { Usable } from "react";

interface PageProps {
    params: Usable<{ roomId: string }>;
}

export default function Page({ params }: PageProps) {
    const { roomId } = React.use(params) as { roomId: string };
    return <VoiceCallRoom params={{ roomId }} />;
}

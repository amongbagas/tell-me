import { NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

export async function POST(req: Request) {
    if (!APP_ID || !APP_CERTIFICATE) {
        return NextResponse.json({ error: "Agora credentials not configured" }, { status: 500 });
    }

    const { channelName, role, uid } = await req.json();

    if (!channelName) {
        return NextResponse.json({ error: "channelName is required" }, { status: 400 });
    }

    const agoraRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
    );

    return NextResponse.json({ token });
}

import { NextRequest, NextResponse } from "next/server";
import { participant } from "@/db/schema";
import { db } from "@/db/drizzle";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { roomId, uid } = body;
        if (!roomId || typeof uid !== "number") {
            return NextResponse.json({ success: false, error: "roomId and uid are required" }, { status: 400 });
        }
        await db
            .update(participant)
            .set({ lastActive: new Date() })
            .where(and(eq(participant.roomId, roomId), eq(participant.uid, uid)));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating participant heartbeat:", error);
        return NextResponse.json({ success: false, error: "Failed to update participant heartbeat" }, { status: 500 });
    }
}

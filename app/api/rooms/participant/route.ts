import { NextResponse, NextRequest } from "next/server";
import { participant } from "@/db/schema";
import { db } from "@/db/drizzle";
import { eq, and } from "drizzle-orm";

// POST /api/rooms/participant (join)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { roomId, uid, role } = body;
        if (!roomId || typeof uid !== "number" || !role) {
            return NextResponse.json({ success: false, error: "roomId, uid, and role are required" }, { status: 400 });
        }
        // Cek apakah sudah ada participant dengan uid ini di room
        const found = await db
            .select()
            .from(participant)
            .where(and(eq(participant.roomId, roomId), eq(participant.uid, uid)))
            .limit(1);
        if (found.length === 0) {
            await db.insert(participant).values({ roomId, uid, role, isMuted: false });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error adding participant:", error);
        return NextResponse.json({ success: false, error: "Failed to add participant" }, { status: 500 });
    }
}

// PATCH /api/rooms/participant (mute/unmute)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { roomId, uid, isMuted } = body;
        if (!roomId || typeof uid !== "number" || typeof isMuted !== "boolean") {
            return NextResponse.json(
                { success: false, error: "roomId, uid, and isMuted are required" },
                { status: 400 }
            );
        }
        await db
            .update(participant)
            .set({ isMuted })
            .where(and(eq(participant.roomId, roomId), eq(participant.uid, uid)));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating participant mute:", error);
        return NextResponse.json({ success: false, error: "Failed to update participant mute" }, { status: 500 });
    }
}

// DELETE /api/rooms/participant (leave)
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get("roomId");
        const uid = searchParams.get("uid");
        if (!roomId || !uid) {
            return NextResponse.json({ success: false, error: "roomId and uid are required" }, { status: 400 });
        }
        await db.delete(participant).where(and(eq(participant.roomId, roomId), eq(participant.uid, Number(uid))));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting participant:", error);
        return NextResponse.json({ success: false, error: "Failed to delete participant" }, { status: 500 });
    }
}

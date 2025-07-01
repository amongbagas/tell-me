import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { room, participant } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get("roomId");
        if (roomId) {
            // Mode polling peserta
            const foundRooms = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
            if (foundRooms.length === 0) {
                return NextResponse.json({ success: false, message: "Room not found." }, { status: 404 });
            }
            const participants = await db
                .select({ uid: participant.uid, isMuted: participant.isMuted, role: participant.role })
                .from(participant)
                .where(eq(participant.roomId, roomId));
            return NextResponse.json({ success: true, roomId, participants });
        } else {
            // Mode find room untuk speaker
            const foundRooms = await db
                .select()
                .from(room)
                .where(eq(room.status, "waiting"))
                .orderBy(room.createdAt)
                .limit(1);
            if (foundRooms.length === 0) {
                return NextResponse.json({ success: false, message: "No available rooms found." }, { status: 404 });
            }
            return NextResponse.json({ success: true, roomId: foundRooms[0].id });
        }
    } catch (error) {
        console.error("Error finding room:", error);
        return NextResponse.json({ success: false, error: "Failed to find a room" }, { status: 500 });
    }
}

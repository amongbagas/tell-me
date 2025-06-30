import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { room } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        // Find the first available room with 'waiting' status
        const availableRooms = await db
            .select()
            .from(room)
            .where(eq(room.status, "waiting"))
            .orderBy(room.createdAt)
            .limit(1);

        if (availableRooms.length > 0) {
            const roomToJoin = availableRooms[0];

            // Update the room status to 'active'
            await db.update(room).set({ status: "active" }).where(eq(room.id, roomToJoin.id));

            return NextResponse.json({ success: true, roomId: roomToJoin.id });
        } else {
            // No waiting rooms available
            return NextResponse.json({ success: false, message: "No available rooms found." }, { status: 404 });
        }
    } catch (error) {
        console.error("Error finding room:", error);
        return NextResponse.json({ success: false, error: "Failed to find a room" }, { status: 500 });
    }
}

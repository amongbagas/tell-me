import { NextResponse, NextRequest } from "next/server";
// import { v4 as uuidv4 } from "uuid";
import { room } from "@/db/schema";
import { db } from "@/db/drizzle";
import { eq } from "drizzle-orm";

// GET /api/rooms?roomId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    if (!roomId) {
        return NextResponse.json({ success: false, error: "roomId is required" }, { status: 400 });
    }
    const found = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
    if (found.length > 0) {
        return NextResponse.json({ success: true, exists: true });
    } else {
        return NextResponse.json({ success: true, exists: false });
    }
}

// POST /api/rooms
export async function POST(req: NextRequest) {
    try {
        // Check for missing or empty body
        const contentLength = req.headers.get ? req.headers.get("content-length") : undefined;
        if (contentLength === "0") {
            console.warn("Request body is missing (content-length is 0)");
            return NextResponse.json({ success: false, error: "Request body is missing" }, { status: 400 });
        }
        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            console.error("Failed to parse JSON body:", jsonError);
            return NextResponse.json({ success: false, error: "Invalid or empty JSON body" }, { status: 400 });
        }
        const { roomId, role, createdBy } = body;
        if (!roomId || !role) {
            return NextResponse.json({ success: false, error: "roomId and role are required" }, { status: 400 });
        }
        if (role !== "listener") {
            return NextResponse.json({ success: false, error: "Only listener can create room" }, { status: 403 });
        }
        // Check if room already exists
        const found = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
        if (found.length > 0) {
            return NextResponse.json({ success: true, exists: true, roomId });
        }
        // Create room
        await db.insert(room).values({
            id: roomId,
            createdBy: createdBy || "listener",
            status: "waiting",
            createdAt: new Date(),
        });
        return NextResponse.json({ success: true, created: true, roomId });
    } catch (error) {
        console.error("Error creating room:", error);
        return NextResponse.json({ success: false, error: "Failed to create room" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get("roomId");

        if (!roomId) {
            return NextResponse.json({ success: false, error: "roomId is required" }, { status: 400 });
        }

        await db.delete(room).where(eq(room.id, roomId));
        return NextResponse.json({ success: true, message: "Room deleted successfully" });
    } catch (error) {
        console.error("Error deleting room:", error);
        return NextResponse.json({ success: false, error: "Failed to delete room" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { roomId, status } = body;

        if (!roomId || !status) {
            return NextResponse.json({ success: false, error: "roomId and status are required" }, { status: 400 });
        }

        // Validate status is one of the allowed values
        if (!["waiting", "active", "closed"].includes(status)) {
            return NextResponse.json({ success: false, error: "Invalid status value" }, { status: 400 });
        }

        await db.update(room).set({ status }).where(eq(room.id, roomId));

        return NextResponse.json({ success: true, message: "Room status updated successfully" });
    } catch (error) {
        console.error("Error updating room status:", error);
        return NextResponse.json({ success: false, error: "Failed to update room status" }, { status: 500 });
    }
}

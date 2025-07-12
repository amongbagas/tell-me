import { NextRequest, NextResponse } from "next/server";
import { websocketServer } from "@/lib/websocket-server";

export async function GET() {
    try {
        const stats = websocketServer.getStats();
        return NextResponse.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error("Error getting WebSocket stats:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to get WebSocket server stats",
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { action } = await req.json();

        if (action === "start") {
            // WebSocket server is automatically started
            return NextResponse.json({
                success: true,
                message: "WebSocket server is running",
                port: 8080,
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: "Invalid action",
            },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error handling WebSocket API request:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to handle WebSocket request",
            },
            { status: 500 }
        );
    }
}

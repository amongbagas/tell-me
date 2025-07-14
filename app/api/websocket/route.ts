import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        // Check if external WebSocket server is running
        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
        const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${httpUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const stats = await response.json();
            return NextResponse.json({
                success: true,
                stats,
                serverUrl: wsUrl,
            });
        } else {
            throw new Error(`WebSocket server returned status ${response.status}`);
        }
    } catch (error) {
        console.error('Error getting WebSocket stats:', error);

        // More specific error messages
        let errorMessage = 'Failed to connect to WebSocket server. Please ensure the server is running.';
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                errorMessage = 'WebSocket server health check timed out.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Could not reach WebSocket server. Check if the server is running and accessible.';
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                serverUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080',
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { action } = await req.json();

        if (action === 'start') {
            // Check if external WebSocket server is running
            const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
            const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');

            try {
                // Add timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                const response = await fetch(`${httpUrl}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json({
                        success: true,
                        message: 'WebSocket server is running',
                        serverUrl: wsUrl,
                        serverStats: data,
                    });
                } else {
                    return NextResponse.json(
                        {
                            success: false,
                            error: `WebSocket server returned status ${response.status}`,
                            serverUrl: wsUrl,
                        },
                        { status: 503 }
                    );
                }
            } catch (fetchError) {
                console.error('Error connecting to WebSocket server:', fetchError);

                let errorMessage = "Could not connect to WebSocket server. Please ensure it's running.";
                if (fetchError instanceof Error) {
                    if (fetchError.name === 'AbortError') {
                        errorMessage = 'WebSocket server health check timed out.';
                    } else if (fetchError.message.includes('ECONNREFUSED')) {
                        errorMessage = 'WebSocket server is not running or refusing connections.';
                    }
                }

                return NextResponse.json(
                    {
                        success: false,
                        error: errorMessage,
                        serverUrl: wsUrl,
                    },
                    { status: 503 }
                );
            }
        }

        if (action === 'stop') {
            // Since server is external, we can't stop it from here
            return NextResponse.json(
                {
                    success: false,
                    error: 'Cannot stop external WebSocket server from this endpoint',
                    message:
                        'The WebSocket server is running as a separate process and cannot be controlled from this API.',
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Invalid action. Supported actions: start',
                supportedActions: ['start'],
            },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error handling WebSocket API request:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to handle WebSocket request',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

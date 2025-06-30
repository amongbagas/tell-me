"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, MicOff, PhoneOff, User, Loader2 } from "lucide-react";

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface Participant {
    uid: number;
    isMuted: boolean;
    role: "speaker" | "listener";
}

interface VoiceCallRoomProps {
    params: {
        roomId: string;
    };
}

type Role = "listener" | "speaker";

export default function VoiceCallRoom({ params }: VoiceCallRoomProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get("role") as Role;

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const handleUserPublished = useCallback(async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        await clientRef.current?.subscribe(user, mediaType);
        if (mediaType === "audio") {
            user.audioTrack?.play();
            setParticipants((prev) => [
                ...prev.filter((p) => p.uid !== user.uid),
                { uid: user.uid as number, isMuted: !user.audioTrack?.isPlaying, role: "speaker" },
            ]);
        }
    }, []);

    const handleUserUnpublished = useCallback((user: IAgoraRTCRemoteUser) => {
        setParticipants((prev) => prev.filter((p) => p.uid !== user.uid));
    }, []);

    useEffect(() => {
        let isMounted = true;
        const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = agoraClient;

        const join = async () => {
            if (!role || !params.roomId) return;

            try {
                const uid = Math.floor(Math.random() * 10000);

                const response = await fetch("/api/agora-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        channelName: params.roomId,
                        uid,
                        role: role === "speaker" ? "publisher" : "subscriber",
                    }),
                });

                if (!response.ok) throw new Error("Failed to fetch Agora token");
                const { token } = await response.json();
                if (!token) throw new Error("Token is missing");

                if (!isMounted) return;

                agoraClient.on("user-published", handleUserPublished);
                agoraClient.on("user-unpublished", handleUserUnpublished);

                await agoraClient.join(AGORA_APP_ID, params.roomId, token, uid);

                if (isMounted) {
                    if (role === "speaker") {
                        const track = await AgoraRTC.createMicrophoneAudioTrack();
                        localAudioTrackRef.current = track;
                        await agoraClient.publish([track]);
                        setParticipants((prev) => [...prev, { uid, isMuted: false, role: "speaker" }]);

                        // Update room status to active when speaker joins
                        try {
                            await fetch("/api/rooms", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    roomId: params.roomId,
                                    status: "active",
                                }),
                            });
                        } catch (error) {
                            console.error("Failed to update room status:", error);
                        }
                    } else {
                        setParticipants((prev) => [...prev, { uid, isMuted: true, role: "listener" }]);
                    }
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to join channel:", error);
                router.push("/dashboard?error=Failed+to+join+the+call");
            }
        };

        join();

        return () => {
            isMounted = false;
            localAudioTrackRef.current?.stop();
            localAudioTrackRef.current?.close();

            if (role === "listener") {
                // Fire-and-forget request to delete the room
                navigator.sendBeacon(`/api/rooms?roomId=${params.roomId}`);
            }

            agoraClient.leave();
            setParticipants([]);
        };
    }, [role, params.roomId, router, handleUserPublished, handleUserUnpublished]);

    const toggleMute = () => {
        if (role === "speaker" && localAudioTrackRef.current) {
            const newMutedState = !isMuted;
            localAudioTrackRef.current.setEnabled(!newMutedState);
            setIsMuted(newMutedState);
            setParticipants((prev) =>
                prev.map((p) => (p.uid === clientRef.current?.uid ? { ...p, isMuted: newMutedState } : p))
            );
        }
    };

    const handleEndCall = async () => {
        if (role === "speaker") {
            try {
                // Update room status to waiting when speaker leaves
                await fetch("/api/rooms", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        roomId: params.roomId,
                        status: "waiting",
                    }),
                });
            } catch (error) {
                console.error("Failed to update room status:", error);
            }
        } else if (role === "listener") {
            try {
                // Delete room if listener is leaving
                fetch(`/api/rooms?roomId=${params.roomId}`, {
                    method: "DELETE",
                    keepalive: true,
                });
            } catch (error) {
                console.error("Failed to send delete room request:", error);
            }
        }
        // The useEffect cleanup will handle leaving the Agora channel upon unmount
        router.push("/dashboard");
    };

    // A listener is waiting if no speaker is in the participants list.
    // A speaker never waits after connecting.
    const isWaiting = role === "listener" && !participants.some((p) => p.role === "speaker");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-[300px]">
                    <CardHeader>
                        <CardTitle className="text-center">Connecting</CardTitle>
                        <CardDescription className="text-center">Setting up your voice call</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <p className="text-muted-foreground">Initializing audio...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center">
                    <Card className="w-full max-w-6xl">
                        <CardHeader className="text-center space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <CardTitle className="text-2xl">Room: {params.roomId}</CardTitle>
                                <Badge variant={role === "speaker" ? "default" : "secondary"}>{role}</Badge>
                            </div>
                            <CardDescription>
                                {participants.length} {participants.length === 1 ? "participant" : "participants"} in
                                the room
                            </CardDescription>
                        </CardHeader>
                        <Separator className="my-2" />
                        <CardContent className="pt-6">
                            {isWaiting ? (
                                <Alert className="max-w-xl mx-auto">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                    <AlertDescription className="ml-2">
                                        Waiting for a speaker to join the room...
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {participants.map((participant) => (
                                            <Card
                                                key={participant.uid}
                                                className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                                            >
                                                <CardContent className="pt-6 pb-4 flex flex-col items-center">
                                                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4 relative">
                                                        <User className="w-16 h-16 text-muted-foreground" />
                                                        {participant.isMuted && (
                                                            <div className="absolute bottom-2 right-2 bg-destructive rounded-full p-1">
                                                                <MicOff className="h-4 w-4 text-destructive-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <h3 className="font-medium mb-1">
                                                            {participant.uid === clientRef.current?.uid
                                                                ? "You"
                                                                : `User ${participant.uid}`}
                                                        </h3>
                                                        <Badge variant="outline" className="text-xs">
                                                            {participant.role}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            <div className="mt-12 flex items-center justify-center gap-4">
                                <TooltipProvider>
                                    {role === "speaker" && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant={isMuted ? "destructive" : "outline"}
                                                    size="lg"
                                                    onClick={toggleMute}
                                                    className="rounded-full w-16 h-16 p-0 flex items-center justify-center hover:scale-105 transition-transform"
                                                >
                                                    {isMuted ? (
                                                        <MicOff className="h-6 w-6" />
                                                    ) : (
                                                        <Mic className="h-6 w-6" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isMuted ? "Unmute microphone" : "Mute microphone"}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="lg"
                                                onClick={handleEndCall}
                                                className="rounded-full w-16 h-16 p-0 flex items-center justify-center hover:scale-105 transition-transform"
                                            >
                                                <PhoneOff className="h-6 w-6" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>End call</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

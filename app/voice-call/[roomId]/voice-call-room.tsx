"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { useParticipantsPolling } from "@/hooks/use-participants-polling";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { Particles } from "@/components/ui/particles";

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface Participant {
    uid: number;
    isMuted: boolean;
    role: "speaker" | "listener";
}

interface VoiceCallRoomProps {
    roomId: string;
}

type Role = "listener" | "speaker";

export default function VoiceCallRoom({ roomId }: VoiceCallRoomProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get("role") as Role;

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [localUid, setLocalUid] = useState<number | null>(null);
    const [userRoles, setUserRoles] = useState<Record<number, Role>>({});
    const [errorPolling, setErrorPolling] = useState<string | null>(null);

    useParticipantsPolling(roomId, setParticipants, setErrorPolling);

    useEffect(() => {
        let isMounted = true;
        const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = agoraClient;

        const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
            await agoraClient.subscribe(user, mediaType);
            if (mediaType === "audio") {
                user.audioTrack?.play();
                const role = userRoles[user.uid as number] || "listener";
                setParticipants((prev) => {
                    return prev.some((p) => p.uid === user.uid)
                        ? prev.map((p) => (p.uid === user.uid ? { ...p, isMuted: !user.audioTrack?.isPlaying } : p))
                        : [...prev, { uid: user.uid as number, isMuted: !user.audioTrack?.isPlaying, role }];
                });
            }
        };

        const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
            setParticipants((prev) =>
                prev.map((p) => (p.uid === user.uid && p.role === "speaker" ? { ...p, isMuted: true } : p))
            );
        };

        const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
            setParticipants((prev) => prev.filter((p) => p.uid !== user.uid));
            setUserRoles((prev) => {
                const newRoles = { ...prev };
                delete newRoles[user.uid as number];
                return newRoles;
            });
        };

        const join = async () => {
            if (!role || !roomId) return;
            try {
                let uid = Number(sessionStorage.getItem(`vc-uid-${roomId}`));
                if (!uid) {
                    uid = Math.floor(Math.random() * 10000);
                    sessionStorage.setItem(`vc-uid-${roomId}`, String(uid));
                }
                setLocalUid(uid);
                setUserRoles((prev) => ({ ...prev, [uid]: role }));

                // Tambahkan participant ke backend
                await fetch("/api/rooms/participant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId: roomId, uid, role }),
                });

                const response = await fetch("/api/agora-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        channelName: roomId,
                        uid,
                        role: "publisher",
                    }),
                });

                if (!response.ok) throw new Error("Failed to fetch Agora token");
                const { token } = await response.json();
                if (!token) throw new Error("Token is missing");

                if (!isMounted) return;

                agoraClient.on("user-published", handleUserPublished);
                agoraClient.on("user-unpublished", handleUserUnpublished);
                agoraClient.on("user-left", handleUserLeft);

                await agoraClient.join(AGORA_APP_ID, roomId, token, uid);

                if (isMounted) {
                    const track = await AgoraRTC.createMicrophoneAudioTrack();
                    localAudioTrackRef.current = track;
                    await track.setEnabled(true);
                    await agoraClient.publish([track]);

                    if (role === "speaker") {
                        try {
                            await fetch("/api/rooms", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    roomId: roomId,
                                    status: "active",
                                }),
                            });
                        } catch (error) {
                            console.error("Failed to update room status:", error);
                        }
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
                navigator.sendBeacon(`/api/rooms?roomId=${roomId}`);
            }

            // Hapus participant dari backend
            if (localUid) {
                fetch(`/api/rooms/participant?roomId=${roomId}&uid=${localUid}`, {
                    method: "DELETE",
                    keepalive: true,
                });
            }

            agoraClient.leave();
            setParticipants([]);
        };
    }, [role, roomId, router]);

    const toggleMute = async () => {
        if (!localAudioTrackRef.current) {
            try {
                const track = await AgoraRTC.createMicrophoneAudioTrack();
                localAudioTrackRef.current = track;
                await track.setEnabled(true);
                await clientRef.current?.publish([track]);
                setIsMuted(false);
                // Update ke backend
                if (localUid) {
                    await fetch("/api/rooms/participant", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ roomId: roomId, uid: localUid, isMuted: false }),
                    });
                }
            } catch (e) {
                console.error("Failed to create or publish audio track:", e);
            }
            return;
        }
        const newMutedState = !isMuted;
        if (!newMutedState) {
            await localAudioTrackRef.current.setEnabled(true);
            await clientRef.current?.publish([localAudioTrackRef.current]);
        } else {
            await clientRef.current?.unpublish([localAudioTrackRef.current]);
            await localAudioTrackRef.current.setEnabled(false);
        }
        setIsMuted(newMutedState);
        // Update ke backend
        if (localUid) {
            await fetch("/api/rooms/participant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId: roomId, uid: localUid, isMuted: newMutedState }),
            });
        }
    };

    const handleEndCall = async () => {
        try {
            await fetch(`/api/rooms/participant?roomId=${roomId}&uid=${localUid}`, {
                method: "DELETE",
                keepalive: true,
            });
        } catch (error) {
            console.error("Failed to delete participant:", error);
        }
        if (role === "speaker") {
            try {
                await fetch("/api/rooms", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        roomId: roomId,
                        status: "waiting",
                    }),
                });
            } catch (error) {
                console.error("Failed to update room status:", error);
            }
        } else if (role === "listener") {
            try {
                await fetch(`/api/rooms?roomId=${roomId}`, {
                    method: "DELETE",
                    keepalive: true,
                });
            } catch (error) {
                console.error("Failed to send delete room request:", error);
            }
        }
        router.push("/dashboard");
    };

    const isWaiting = role === "listener" && !participants.some((p) => p.role === "speaker");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-[300px]">
                    <CardHeader>
                        <CardTitle className="text-center">Menunggu...</CardTitle>
                        <CardDescription className="text-center">Menyiapkan ruang panggilan...</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <p className="text-muted-foreground">Menyiapkan Audio</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-4xl mx-auto relative z-10">
                <div className="flex flex-col items-center ">
                    <Card className="w-full max-w-6xl ">
                        <CardHeader className="text-center space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <CardTitle className="text-2xl">
                                    <SparklesText>Tell Me</SparklesText>
                                </CardTitle>
                                <Badge variant={role === "speaker" ? "default" : "secondary"}>{role}</Badge>
                            </div>
                            <CardDescription>
                                {/* {participants.length} {participants.length === 1 ? "Orang" : "Orang"} di Ruangan */}
                                Untuk menjagamu, identitasmu akan kami samarkan sepenuhnya.
                            </CardDescription>
                        </CardHeader>
                        <Separator className="my-2" />
                        <CardContent className="pt-6">
                            {errorPolling && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{errorPolling}</AlertDescription>
                                </Alert>
                            )}
                            {isWaiting ? (
                                <Alert className="max-w-xl mx-auto">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                    <AlertDescription className="ml-2">
                                        Menunggu speaker untuk bergabung...
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <ScrollArea className="h-[300px] pr-4 ">
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
                                                            {participant.uid === localUid
                                                                ? "You"
                                                                : `User ${participant.uid}`}
                                                        </h3>
                                                        <Badge
                                                            variant={
                                                                participant.role === "speaker" ? "default" : "secondary"
                                                            }
                                                        >
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
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={isMuted ? "destructive" : "outline"}
                                                size="lg"
                                                onClick={toggleMute}
                                                className="rounded-full w-16 h-16 p-0 flex items-center justify-center hover:scale-105 transition-transform"
                                            >
                                                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isMuted ? "Unmute microphone" : "Mute microphone"}</p>
                                        </TooltipContent>
                                    </Tooltip>
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
                                            <p>End Call</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="absolute inset-0 z-0">
                <Particles />
            </div>
        </div>
    );
}

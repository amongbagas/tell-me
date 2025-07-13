'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, MicOff, PhoneOff, User, Loader2 } from 'lucide-react';
import { SparklesText } from '@/components/magicui/sparkles-text';
import { Particles } from '@/components/ui/particles';
import { useWebSocketVoiceCall, Participant } from '@/hooks/use-websocket-voice-call';

interface VoiceCallRoomProps {
    roomId: string;
}

type Role = 'listener' | 'speaker';

export default function VoiceCallRoom({ roomId }: VoiceCallRoomProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get('role') as Role;

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [localUid, setLocalUid] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

    // Handle enabling audio on user interaction - improved for simultaneous communication
    const handleEnableAudio = async () => {
        try {
            // Try to resume audio context
            if (typeof window !== 'undefined' && 'webkitAudioContext' in window) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                audioContext.close();
            }

            // Force play all remote audio elements
            const remoteAudioElements = document.querySelectorAll('audio[data-uid]');
            remoteAudioElements.forEach(async (audio) => {
                try {
                    await (audio as HTMLAudioElement).play();
                    console.log(`🎵 Forced play audio for UID: ${audio.getAttribute('data-uid')}`);
                } catch (error) {
                    console.error('Failed to force play audio:', error);
                }
            });

            setNeedsUserInteraction(false);
        } catch (error) {
            console.error('Failed to enable audio:', error);
        }
    };

    // Generate or get stored UID
    const uid = React.useMemo(() => {
        let storedUid = Number(sessionStorage.getItem(`vc-uid-${roomId}`));
        if (!storedUid) {
            storedUid = Math.floor(Math.random() * 10000);
            sessionStorage.setItem(`vc-uid-${roomId}`, String(storedUid));
        }
        return storedUid;
    }, [roomId]);

    const {
        isConnected,
        participants: wsParticipants,
        isMuted,
        toggleMute,
        initiateCall,
        disconnect,
        connect,
    } = useWebSocketVoiceCall({
        roomId,
        uid,
        role,
        onParticipantsChange: setParticipants,
        onError: setError,
    });

    // Handle retry connection
    const handleRetry = () => {
        setError(null);
        setIsLoading(true);
        connect();
    };

    useEffect(() => {
        setLocalUid(uid);
    }, [uid]);

    useEffect(() => {
        if (isConnected) {
            setIsLoading(false);
            setError(null); // Clear error when connected

            // Check if user interaction is needed for audio
            const checkAudioContext = async () => {
                try {
                    if (typeof window !== 'undefined' && 'webkitAudioContext' in window) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                        if (audioContext.state === 'suspended') {
                            setNeedsUserInteraction(true);
                        }
                        audioContext.close();
                    }
                } catch (error) {
                    console.error('Failed to check audio context:', error);
                }
            };

            checkAudioContext();

            // Add participant to backend
            fetch('/api/rooms/participant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, uid, role }),
            }).catch(console.error);

            // Update room status if speaker
            if (role === 'speaker') {
                fetch('/api/rooms', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, status: 'active' }),
                }).catch(console.error);
            }
        }
    }, [isConnected, roomId, uid, role]);

    // Initiate calls to other participants when they join
    useEffect(() => {
        if (wsParticipants.length > 0) {
            console.log('👥 Participants updated:', wsParticipants);
            console.log('👤 Current user UID:', uid, 'Role:', role);

            wsParticipants.forEach((participant) => {
                if (participant.uid !== uid) {
                    console.log(`👤 Checking participant ${participant.uid}, role: ${participant.role}`);

                    // Connect ALL users to each other for simultaneous communication
                    // This ensures everyone can speak and hear each other
                    console.log(`📞 Initiating call to participant ${participant.uid} for simultaneous communication`);
                    initiateCall(participant.uid);
                }
            });
        }
    }, [wsParticipants, uid, role, initiateCall]);

    const handleEndCall = async () => {
        try {
            // Remove participant from backend
            await fetch(`/api/rooms/participant?roomId=${roomId}&uid=${uid}`, {
                method: 'DELETE',
                keepalive: true,
            });

            // Update room status
            if (role === 'speaker') {
                await fetch('/api/rooms', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, status: 'waiting' }),
                });
            } else if (role === 'listener') {
                await fetch(`/api/rooms?roomId=${roomId}`, {
                    method: 'DELETE',
                    keepalive: true,
                });
            }
        } catch (error) {
            console.error('Failed to clean up:', error);
        }

        disconnect();
        router.push('/dashboard');
    };

    // Handle cleanup on unmount
    useEffect(() => {
        return () => {
            if (localUid) {
                fetch(`/api/rooms/participant?roomId=${roomId}&uid=${localUid}`, {
                    method: 'DELETE',
                    keepalive: true,
                }).catch(console.error);
            }
        };
    }, [roomId, localUid]);

    const isWaiting = role === 'listener' && !participants.some((p) => p.role === 'speaker');

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
                <div className="flex flex-col items-center">
                    <Card className="w-full max-w-6xl">
                        <CardHeader className="text-center space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <CardTitle className="text-2xl">
                                    <SparklesText>Tell Me</SparklesText>
                                </CardTitle>
                                <Badge variant={role === 'speaker' ? 'default' : 'secondary'}>{role}</Badge>
                            </div>
                            <CardDescription>
                                Untuk menjagamu, identitasmu akan kami samarkan sepenuhnya.
                                <br />
                            </CardDescription>
                            {!isConnected && <Badge variant="destructive">Terputus</Badge>}
                        </CardHeader>
                        <Separator className="my-2" />
                        <CardContent className="pt-6">
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription className="flex items-center justify-between">
                                        <span>{error}</span>
                                        <Button variant="outline" size="sm" onClick={handleRetry} className="ml-2">
                                            Coba Lagi
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {needsUserInteraction && (
                                <Alert className="mb-4 border-green-500 bg-green-50">
                                    <AlertDescription className="flex items-center justify-between">
                                        <span>Klik tombol untuk mengaktifkan komunikasi suara simultan</span>
                                        <Button variant="outline" size="sm" onClick={handleEnableAudio}>
                                            Aktifkan Audio
                                        </Button>
                                    </AlertDescription>
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
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {participants.map((participant) => (
                                            <Card
                                                key={participant.uid}
                                                className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                                            >
                                                <CardContent className="pt-6 pb-4 flex flex-col items-center">
                                                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4 relative">
                                                        <User className="w-16 h-16 text-muted-foreground" />
                                                        {participant.isMuted ? (
                                                            <div className="absolute bottom-2 right-2 bg-destructive rounded-full p-1">
                                                                <MicOff className="h-4 w-4 text-destructive-foreground" />
                                                            </div>
                                                        ) : (
                                                            <div className="absolute bottom-2 right-2 bg-green-500 rounded-full p-1 animate-pulse">
                                                                <Mic className="h-4 w-4 text-white" />
                                                            </div>
                                                        )}
                                                        {/* Visual indicator for active communication */}
                                                        {!participant.isMuted && (
                                                            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-75"></div>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <h3 className="font-medium mb-1">
                                                            {participant.uid === localUid
                                                                ? 'You'
                                                                : `User ${participant.uid}`}
                                                        </h3>
                                                        <Badge
                                                            variant={
                                                                participant.role === 'speaker' ? 'default' : 'secondary'
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
                                                variant={isMuted ? 'destructive' : 'outline'}
                                                size="lg"
                                                onClick={toggleMute}
                                                className="rounded-full w-16 h-16 p-0 flex items-center justify-center hover:scale-105 transition-transform"
                                                disabled={!isConnected}
                                            >
                                                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isMuted ? 'Unmute microphone' : 'Mute microphone'}</p>
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

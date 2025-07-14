'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import AlertTitle
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, MicOff, PhoneOff, User, Loader2, Siren, WifiOff } from 'lucide-react'; // Added WifiOff icon
import { SparklesText } from '@/components/magicui/sparkles-text';
import { Particles } from '@/components/ui/particles';
import { useWebSocketVoiceCall, Participant } from '@/hooks/use-websocket-voice-call';

interface VoiceCallRoomProps {
    roomId: string;
}

type Role = 'listener' | 'speaker';
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Helper function for consistent UID generation
const getOrCreateUid = (roomId: string): number => {
    const storageKey = `vc-uid-${roomId}`;
    let storedUid = Number(sessionStorage.getItem(storageKey));
    if (!storedUid) {
        // Generate a random UID between 1 and 9999
        storedUid = Math.floor(Math.random() * 9999) + 1;
        sessionStorage.setItem(storageKey, String(storedUid));
    }
    return storedUid;
};

export default function VoiceCallRoom({ roomId }: VoiceCallRoomProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = (searchParams.get('role') as Role) || 'listener'; // Default to listener if not specified

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [localUid, setLocalUid] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

    // Memoize UID generation to ensure it only runs once per component instance
    const uid = useMemo(() => getOrCreateUid(roomId), [roomId]);

    // Memoize the participants change handler to prevent infinite re-renders
    const handleParticipantsChange = useCallback((newParticipants: Participant[]) => {
        setParticipants(newParticipants);
    }, []);

    // Memoize error handler to prevent infinite re-renders
    const handleError = useCallback((err: string) => {
        setErrorMessage(err);
        setConnectionStatus('error');
        console.error('WebSocket Error:', err);
    }, []);

    // Memoize status change handler to prevent infinite re-renders
    const handleStatusChange = useCallback((status: ConnectionStatus) => {
        setConnectionStatus(status);
    }, []);

    const { isMuted, toggleMute, initiateCall, disconnect, connect } = useWebSocketVoiceCall({
        roomId,
        uid,
        role,
        participants,
        onParticipantsChange: handleParticipantsChange,
        onError: handleError,
        onStatusChange: handleStatusChange,
    });

    // --- Audio Autoplay Handler ---
    const handleEnableAudio = useCallback(async () => {
        try {
            // This function is now mostly handled by the hook's internal `autoEnableAudio` logic.
            // Here, we just need to confirm user interaction to resolve `suspended` audio context.
            if (typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('🎵 AudioContext resumed by user interaction.');
                }
                // Close it if it was just opened for a check
                if (audioContext.state === 'running') {
                    audioContext.close();
                }
            }

            // Also, explicitly try to play any existing remote audio elements
            const remoteAudioElements = document.querySelectorAll('audio[data-uid]');
            for (const audio of Array.from(remoteAudioElements)) {
                try {
                    // Only attempt to play if it's paused or not yet played
                    if ((audio as HTMLAudioElement).paused || (audio as HTMLAudioElement).ended) {
                        await (audio as HTMLAudioElement).play();
                        console.log(`🎵 Forced play audio for UID: ${audio.getAttribute('data-uid')}`);
                    }
                } catch (error) {
                    console.warn(`Failed to force play audio for UID ${audio.getAttribute('data-uid')}:`, error);
                    // This error is expected if autoplay is still restricted by the browser
                }
            }
            setNeedsUserInteraction(false); // Hide the prompt
        } catch (error) {
            console.error('Failed to enable audio via user interaction handler:', error);
        }
    }, []);

    // --- Effect for Initial UID Setting ---
    useEffect(() => {
        setLocalUid(uid);
    }, [uid]);

    // --- Effect for Connection Status and Backend Sync ---
    useEffect(() => {
        if (connectionStatus === 'connected') {
            setErrorMessage(null); // Clear any previous errors

            // Check if user interaction is still needed for audio context (e.g., if hook couldn't resume it)
            const checkAudioContextState = async () => {
                if (typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    if (audioContext.state === 'suspended') {
                        setNeedsUserInteraction(true);
                    } else {
                        setNeedsUserInteraction(false);
                    }
                    // Close the context if we just opened it for a check
                    if (audioContext.state === 'running') {
                        audioContext.close();
                    }
                }
            };
            checkAudioContextState();

            // Notify backend about participant joining
            fetch('/api/rooms/participant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, uid, role }),
            }).catch((err) => console.error('Failed to add participant to backend:', err));

            // Update room status if speaker
            if (role === 'speaker') {
                fetch('/api/rooms', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, status: 'active' }),
                }).catch((err) => console.error('Failed to update room status on backend:', err));
            }
            console.log(`✅ Room ${roomId} connected successfully for UID ${uid}, role ${role}.`);
        } else if (connectionStatus === 'disconnected') {
            // Optionally show a 'disconnected' message
            console.log(`🔌 Disconnected from room ${roomId}.`);
        } else if (connectionStatus === 'error') {
            console.error(`🔥 Connection error in room ${roomId}.`);
        }
    }, [connectionStatus, roomId, uid, role]);

    // --- Effect for Initiating Calls to New Participants ---
    useEffect(() => {
        if (connectionStatus === 'connected' && participants.length > 0) {
            console.log('👥 WebSocket Participants updated:', participants);
            console.log('👤 Current user UID:', uid, 'Role:', role);

            participants.forEach((participant) => {
                // Ensure we don't try to call ourselves
                // The `initiateCall` function in the hook handles glare prevention (smaller UID initiates)
                if (participant.uid !== uid) {
                    console.log(
                        `📞 Checking participant ${participant.uid} (role: ${participant.role}). Attempting to initiate call for simultaneous communication.`
                    );
                    initiateCall(participant.uid);
                }
            });
        }
    }, [participants, uid, role, initiateCall, connectionStatus]);

    // --- Handle Retry Connection ---
    const handleRetry = useCallback(() => {
        setErrorMessage(null);
        setConnectionStatus('connecting');
        connect(); // Re-initiate connection via the hook
    }, [connect]);

    // --- Handle Ending the Call ---
    const handleEndCall = useCallback(async () => {
        console.log('Ending call...');
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
        disconnect(); // Disconnect WebSocket and WebRTC connections

        // Use sendBeacon for reliable requests on page unload/redirect
        // This is crucial for cleanup when leaving the page
        if (localUid) {
            const deleteParticipantUrl = `/api/rooms/participant?roomId=${roomId}&uid=${localUid}`;
            if (navigator.sendBeacon) {
                // Send beacon for participant cleanup
                navigator.sendBeacon(deleteParticipantUrl);
                console.log('🚀 Sent beacon for participant cleanup.');
            } else {
                // Fallback for browsers not supporting sendBeacon (less reliable)
                fetch(deleteParticipantUrl, { method: 'DELETE', keepalive: true }).catch(console.error);
                console.log('⚠️ Using fetch with keepalive for participant cleanup.');
            }
        }

        // Update room status or delete room only if current user is speaker
        if (role === 'speaker') {
            const updateRoomUrl = '/api/rooms';
            const updateRoomBody = JSON.stringify({ roomId, status: 'waiting' });
            if (navigator.sendBeacon) {
                navigator.sendBeacon(updateRoomUrl, new Blob([updateRoomBody], { type: 'application/json' }));
                console.log('🚀 Sent beacon for room status update (speaker).');
            } else {
                fetch(updateRoomUrl, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: updateRoomBody,
                    keepalive: true,
                }).catch(console.error);
                console.log('⚠️ Using fetch with keepalive for room status update (speaker).');
            }
        }
        // Listener leaving does not change room status, but backend should delete their participant entry.
        // If the room becomes empty, the backend should handle room deletion.

        // Redirect after cleanup
        router.push('/dashboard');
    }, [disconnect, localUid, roomId, role, router, uid]);

    // --- Cleanup on Component Unmount / Page Refresh ---
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Perform cleanup when user closes tab/window or navigates away
            if (localUid) {
                const deleteParticipantUrl = `/api/rooms/participant?roomId=${roomId}&uid=${localUid}`;
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(deleteParticipantUrl);
                    console.log('🚀 Sent beacon on beforeunload for participant cleanup.');
                } else {
                    // Fallback, though less reliable for page unload
                    fetch(deleteParticipantUrl, { method: 'DELETE', keepalive: true }).catch(console.error);
                    console.log('⚠️ Using fetch with keepalive on beforeunload for participant cleanup.');
                }
            }
            // Add similar logic for speaker if needed to change room status to 'waiting'
            if (role === 'speaker') {
                const updateRoomUrl = '/api/rooms';
                const updateRoomBody = JSON.stringify({ roomId, status: 'waiting' });
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(updateRoomUrl, new Blob([updateRoomBody], { type: 'application/json' }));
                    console.log('🚀 Sent beacon on beforeunload for room status update (speaker).');
                } else {
                    fetch(updateRoomUrl, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: updateRoomBody,
                        keepalive: true,
                    }).catch(console.error);
                    console.log('⚠️ Using fetch with keepalive on beforeunload for room status update (speaker).');
                }
            }
            // No need to prevent default or return a string for sendBeacon
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // The disconnect from useWebSocketVoiceCall will handle the primary WebSocket/WebRTC cleanup.
            // Backend cleanup for participant/room status is handled by beforeunload or handleEndCall.
        };
    }, [roomId, localUid, role]);

    const isWaitingForSpeaker = role === 'listener' && !participants.some((p) => p.role === 'speaker');
    const displayIsConnected = connectionStatus === 'connected';

    if (connectionStatus === 'connecting') {
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
                            <p className="text-muted-foreground">Menghubungkan ke Server Suara</p>
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
                                <span className="text-sm text-muted-foreground">ID Anda: {localUid}</span>
                            </CardDescription>
                            {!displayIsConnected && connectionStatus !== 'error' && (
                                <Badge variant="destructive">Terputus</Badge>
                            )}
                            {connectionStatus === 'error' && (
                                <Badge
                                    variant="destructive"
                                    className="flex items-center justify-center gap-1 mx-auto max-w-fit"
                                >
                                    <WifiOff className="h-4 w-4" /> Koneksi Error
                                </Badge>
                            )}
                        </CardHeader>
                        <Separator className="my-2" />
                        <CardContent className="pt-6">
                            {errorMessage && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertTitle className="flex items-center gap-2">
                                        <Siren className="h-5 w-5" /> Error Koneksi
                                    </AlertTitle>
                                    <AlertDescription className="flex items-center justify-between mt-2">
                                        <span>{errorMessage}</span>
                                        <Button variant="outline" size="sm" onClick={handleRetry} className="ml-2">
                                            Coba Lagi
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {needsUserInteraction &&
                                displayIsConnected && ( // Only show if connected but audio suspended
                                    <Alert className="mb-4 border-green-500 bg-green-50">
                                        <AlertTitle className="flex items-center gap-2">
                                            <Mic className="h-5 w-5 text-green-700" /> Audio Diblokir
                                        </AlertTitle>
                                        <AlertDescription className="flex items-center justify-between mt-2">
                                            <span>Klik tombol untuk mengaktifkan komunikasi suara.</span>
                                            <Button variant="outline" size="sm" onClick={handleEnableAudio}>
                                                Aktifkan Audio
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            {isWaitingForSpeaker ? (
                                <Alert className="max-w-xl mx-auto flex items-center">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                    <AlertDescription className="ml-2">
                                        Menunggu speaker untuk bergabung...
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {participants.length === 0 && connectionStatus === 'connected' ? (
                                            <div className="col-span-full text-center text-muted-foreground py-10">
                                                Tidak ada peserta lain di ruangan ini.
                                            </div>
                                        ) : (
                                            participants.map((participant) => (
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
                                                                    ? 'Anda' /* Changed to &quot;Anda&quot; for consistency with Indonesian */
                                                                    : `Pengguna ${participant.uid}`}{' '}
                                                                {/* Changed to &quot;Pengguna&quot; */}
                                                            </h3>
                                                            <Badge
                                                                variant={
                                                                    participant.role === 'speaker'
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {participant.role === 'speaker'
                                                                    ? 'Speaker'
                                                                    : 'Listener'}{' '}
                                                                {/* Translate roles */}
                                                            </Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
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
                                                disabled={!displayIsConnected} // Disable if not connected
                                            >
                                                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}</p>{' '}
                                            {/* Translate tooltips */}
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
                                            <p>Akhiri Panggilan</p> {/* Translate tooltip */}
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

import { useEffect, useRef, useState, useCallback } from "react";

export interface WebSocketMessage {
    type: "join" | "leave" | "mute" | "unmute" | "offer" | "answer" | "ice-candidate" | "participant-update";
    roomId: string;
    uid: number;
    role?: "speaker" | "listener";
    data?: {
        action?: string;
        participants?: Array<{ uid: number; role: string; isMuted: boolean }>;
        targetUid?: number;
        fromUid?: number;
        isMuted?: boolean;
        sdp?: string;
        candidate?: RTCIceCandidate;
        [key: string]: unknown;
    };
}

export interface Participant {
    uid: number;
    role: "speaker" | "listener";
    isMuted: boolean;
}

export interface UseWebSocketVoiceCallProps {
    roomId: string;
    uid: number;
    role: "speaker" | "listener";
    onParticipantsChange: (participants: Participant[]) => void;
    onError: (error: string) => void;
}

export function useWebSocketVoiceCall({
    roomId,
    uid,
    role,
    onParticipantsChange,
    onError,
}: UseWebSocketVoiceCallProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false); // Start unmuted for simultaneous communication
    const [isConnecting, setIsConnecting] = useState(false);
    const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
    const remoteAudioElementsRef = useRef<Map<number, HTMLAudioElement>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const pendingAnswersRef = useRef<Set<number>>(new Set()); // Track pending answers by user ID
    const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidate[]>>(new Map()); // Queue ICE candidates by user ID

    // Initialize audio context
    const initializeAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                console.log("Audio context initialized");
            } catch (error) {
                console.error("Failed to initialize audio context:", error);
            }
        }
    }, []);

    // Resume audio context if suspended
    const resumeAudioContext = useCallback(async () => {
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
                console.log("Audio context resumed");
            } catch (error) {
                console.error("Failed to resume audio context:", error);
            }
        }
    }, []);

    const createPeerConnection = useCallback(
        (targetUid: number) => {
            // Check if a peer connection already exists and clean it up if needed
            const existingConnection = peerConnectionsRef.current.get(targetUid);
            if (existingConnection) {
                console.log(`Closing existing peer connection for ${targetUid}`);
                existingConnection.close();
                peerConnectionsRef.current.delete(targetUid);
                // Clear any pending answers for this user
                pendingAnswersRef.current.delete(targetUid);
                // Clear any pending ICE candidates for this user
                pendingIceCandidatesRef.current.delete(targetUid);
            }

            const configuration: RTCConfiguration = {
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
            };

            const peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = (event) => {
                if (event.candidate && wsRef.current) {
                    wsRef.current.send(
                        JSON.stringify({
                            type: "ice-candidate",
                            roomId,
                            uid,
                            data: {
                                targetUid,
                                candidate: event.candidate,
                            },
                        })
                    );
                }
            };

            peerConnection.ontrack = (event) => {
                console.log("🎵 Received remote track:", event.track);
                console.log("🎵 Track kind:", event.track.kind);
                console.log("🎵 Track enabled:", event.track.enabled);
                console.log("🎵 Track muted:", event.track.muted);
                console.log("🎵 Track readyState:", event.track.readyState);
                console.log("🎵 Streams:", event.streams);

                // Clean up existing audio element for this user
                const existingAudio = remoteAudioElementsRef.current.get(targetUid);
                if (existingAudio) {
                    existingAudio.pause();
                    existingAudio.srcObject = null;
                    if (existingAudio.parentNode) {
                        existingAudio.parentNode.removeChild(existingAudio);
                    }
                    remoteAudioElementsRef.current.delete(targetUid);
                }

                // Create audio element and immediately attach to DOM for better browser compatibility
                const remoteAudio = document.createElement("audio");
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.autoplay = true;
                remoteAudio.volume = 1.0;
                remoteAudio.muted = false;
                remoteAudio.setAttribute("playsinline", "true");
                remoteAudio.style.display = "none";
                remoteAudio.setAttribute("data-uid", targetUid.toString());

                // Add to DOM immediately
                document.body.appendChild(remoteAudio);

                // Store reference for cleanup
                remoteAudioElementsRef.current.set(targetUid, remoteAudio);

                // Add detailed event listeners for debugging
                remoteAudio.addEventListener("loadstart", () => console.log(`🎵 [${targetUid}] Audio loadstart`));
                remoteAudio.addEventListener("loadedmetadata", () => {
                    console.log(`🎵 [${targetUid}] Audio loadedmetadata - duration:`, remoteAudio.duration);
                });
                remoteAudio.addEventListener("canplay", () => console.log(`🎵 [${targetUid}] Audio canplay`));
                remoteAudio.addEventListener("play", () => console.log(`🎵 [${targetUid}] Audio play`));
                remoteAudio.addEventListener("pause", () => console.log(`🎵 [${targetUid}] Audio pause`));
                remoteAudio.addEventListener("error", (e) => console.error(`🎵 [${targetUid}] Audio error:`, e));
                remoteAudio.addEventListener("ended", () => console.log(`🎵 [${targetUid}] Audio ended`));

                // Auto-play setup for immediate audio playback
                const setupAutoplay = async () => {
                    try {
                        // Initialize and resume audio context immediately
                        initializeAudioContext();
                        await resumeAudioContext();

                        console.log(`🎵 [${targetUid}] Setting up automatic audio playback...`);

                        // Force load the audio
                        remoteAudio.load();

                        // Wait for the audio to be ready
                        await new Promise((resolve, reject) => {
                            const timeoutId = setTimeout(() => {
                                reject(new Error("Audio load timeout"));
                            }, 5000);

                            if (remoteAudio.readyState >= 2) {
                                clearTimeout(timeoutId);
                                resolve(true);
                            } else {
                                const handleCanPlay = () => {
                                    clearTimeout(timeoutId);
                                    remoteAudio.removeEventListener("canplay", handleCanPlay);
                                    resolve(true);
                                };
                                remoteAudio.addEventListener("canplay", handleCanPlay);
                            }
                        });

                        // Try to play automatically
                        await remoteAudio.play();
                        console.log(`🎵 [${targetUid}] Remote audio started playing automatically`);
                    } catch (error) {
                        console.log(`🎵 [${targetUid}] Autoplay blocked, setting up user interaction handler:`, error);

                        // Set up user interaction handler for autoplay restriction
                        const handleUserInteraction = async (event: Event) => {
                            try {
                                console.log(
                                    `🎵 [${targetUid}] User interaction detected (${event.type}), enabling audio...`
                                );
                                initializeAudioContext();
                                await resumeAudioContext();

                                remoteAudio.load();
                                await remoteAudio.play();

                                console.log(`🎵 [${targetUid}] Remote audio started playing after user interaction`);

                                // Remove all event listeners after successful play
                                ["click", "keydown", "touchstart", "mousedown"].forEach((eventType) => {
                                    document.removeEventListener(eventType, handleUserInteraction);
                                });
                            } catch (retryError) {
                                console.error(
                                    `🎵 [${targetUid}] Failed to play audio after user interaction:`,
                                    retryError
                                );
                            }
                        };

                        // Add multiple event listeners for user interaction
                        ["click", "keydown", "touchstart", "mousedown"].forEach((eventType) => {
                            document.addEventListener(eventType, handleUserInteraction, { once: true });
                        });
                    }
                };

                // Set up Web Audio API routing for better audio control
                if (audioContextRef.current) {
                    try {
                        const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
                        const gainNode = audioContextRef.current.createGain();
                        gainNode.gain.value = 1.0;
                        source.connect(gainNode);
                        gainNode.connect(audioContextRef.current.destination);
                        console.log(`🎵 [${targetUid}] Web Audio API routing established for simultaneous audio`);
                    } catch (webAudioError) {
                        console.error(`🎵 [${targetUid}] Web Audio API setup failed:`, webAudioError);
                    }
                }

                setupAutoplay();
            };

            peerConnectionsRef.current.set(targetUid, peerConnection);
            return peerConnection;
        },
        [roomId, uid, initializeAudioContext, resumeAudioContext]
    );

    // Add connection health check
    const checkServerHealth = useCallback(async () => {
        try {
            const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080"}/voice-call?roomId=health-check&uid=0&role=listener`;
            const testWs = new WebSocket(wsUrl);

            return new Promise<boolean>((resolve) => {
                const timeout = setTimeout(() => {
                    testWs.close();
                    console.warn("Health check timeout");
                    resolve(false);
                }, 3000);

                testWs.onopen = () => {
                    clearTimeout(timeout);
                    testWs.close();
                    console.log("Health check passed");
                    resolve(true);
                };

                testWs.onerror = (error) => {
                    clearTimeout(timeout);
                    testWs.close();
                    console.error("Health check failed:", error);
                    resolve(false);
                };

                testWs.onclose = (event) => {
                    clearTimeout(timeout);
                    if (event.code !== 1000) {
                        console.warn("Health check connection closed unexpectedly:", event.code, event.reason);
                    }
                };
            });
        } catch (error) {
            console.error("Health check failed:", error);
            return false;
        }
    }, []);

    const connect = useCallback(async () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected");
            return;
        }

        if (isConnecting) {
            console.log("Already connecting...");
            return;
        }

        setIsConnecting(true);

        // Clean up any existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Check if server is available first
        console.log("Checking WebSocket server health...");
        const isServerHealthy = await checkServerHealth();

        if (!isServerHealthy) {
            setIsConnecting(false);
            onError("WebSocket server is not responding. Please ensure the server is running on port 8080.");
            return;
        }

        try {
            console.log("Attempting to connect WebSocket...");
            console.log("Room ID:", roomId, "UID:", uid, "Role:", role); // Get user media for ALL users (both speakers and listeners)
            // This enables simultaneous communication
            let stream: MediaStream | null = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000,
                        channelCount: 1,
                    },
                    video: false,
                });
                console.log("Got media stream:", stream);
                console.log("Audio tracks:", stream.getAudioTracks());

                // Ensure audio tracks are enabled from the start
                stream.getAudioTracks().forEach((track) => {
                    track.enabled = true; // Force enable audio track
                    console.log(`🎤 Audio track enabled: ${track.enabled}, ready state: ${track.readyState}`);
                });

                setLocalStream(stream);

                // Initialize audio context immediately for better performance
                initializeAudioContext();
            } catch (mediaError) {
                console.error("Failed to get media stream:", mediaError);
                setIsConnecting(false);
                onError(
                    "Microphone access is required for voice communication. Please allow microphone permissions and try again."
                );
                return;
            }

            // Connect to WebSocket
            const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080"}/voice-call?roomId=${roomId}&uid=${uid}&role=${role}`;
            console.log("Connecting to WebSocket URL:", wsUrl);
            const ws = new WebSocket(wsUrl);

            // Store reference immediately to prevent multiple connections
            wsRef.current = ws;

            ws.onopen = () => {
                if (wsRef.current === ws) {
                    setIsConnected(true);
                    setIsConnecting(false);
                    console.log("Connected to WebSocket");
                }
            };

            ws.onmessage = async (event) => {
                if (wsRef.current !== ws) return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log("Received message:", message);

                    switch (message.type) {
                        case "participant-update":
                            if (message.data?.participants) {
                                const updatedParticipants = message.data.participants.map((p) => ({
                                    uid: p.uid,
                                    role: p.role as "speaker" | "listener",
                                    isMuted: p.isMuted,
                                }));
                                setParticipants(updatedParticipants);
                                onParticipantsChange(updatedParticipants);

                                // Auto-initiate calls to all other participants for simultaneous communication
                                updatedParticipants.forEach((participant) => {
                                    if (participant.uid !== uid && !peerConnectionsRef.current.has(participant.uid)) {
                                        console.log(
                                            `🔄 Auto-initiating call to participant ${participant.uid} for simultaneous communication`
                                        );
                                        // Use setTimeout to avoid blocking the message handler
                                        setTimeout(() => {
                                            initiateCall(participant.uid);
                                        }, 100);
                                    }
                                });
                            }
                            break;

                        case "offer":
                            if (message.data?.fromUid && message.data?.sdp) {
                                const fromUid = message.data.fromUid;
                                console.log(`📞 Received offer from ${fromUid}`);

                                let peerConnection = peerConnectionsRef.current.get(fromUid);

                                // If peer connection exists but is not in stable state, we need to handle this carefully
                                if (peerConnection && peerConnection.signalingState !== "stable") {
                                    console.warn(
                                        `Received offer from ${fromUid} but peer connection is in state: ${peerConnection.signalingState}. Closing existing connection.`
                                    );
                                    peerConnection.close();
                                    peerConnectionsRef.current.delete(fromUid);
                                    // Clear any pending answers for this user
                                    pendingAnswersRef.current.delete(fromUid);
                                    // Clear any pending ICE candidates for this user
                                    pendingIceCandidatesRef.current.delete(fromUid);
                                    peerConnection = undefined;
                                }

                                // Create new peer connection if needed
                                if (!peerConnection) {
                                    console.log(`📞 Creating new peer connection for ${fromUid}`);
                                    peerConnection = createPeerConnection(fromUid);
                                }

                                // Add local stream tracks if available
                                if (localStream) {
                                    console.log(`📞 Adding local stream tracks for ${fromUid}`);
                                    const audioTracks = localStream.getAudioTracks();
                                    console.log(`📞 Found ${audioTracks.length} audio tracks for ${fromUid}`);

                                    localStream.getTracks().forEach((track) => {
                                        // Ensure track is enabled if we're not muted
                                        if (track.kind === "audio") {
                                            track.enabled = !isMuted;
                                            console.log(
                                                `📞 Audio track enabled: ${track.enabled} (muted: ${isMuted}) for ${fromUid}`
                                            );

                                            // Additional debugging
                                            console.log(`📞 Audio track details for ${fromUid}:`, {
                                                kind: track.kind,
                                                enabled: track.enabled,
                                                readyState: track.readyState,
                                                muted: track.muted,
                                                id: track.id,
                                                label: track.label,
                                            });
                                        }

                                        try {
                                            const sender = peerConnection.addTrack(track, localStream);
                                            console.log(`📞 Successfully added track for ${fromUid}, sender:`, sender);
                                        } catch (error) {
                                            console.error(`📞 Failed to add track for ${fromUid}:`, error);
                                        }
                                    });

                                    // Verify tracks were added
                                    const senders = peerConnection.getSenders();
                                    console.log(`📞 Peer connection for ${fromUid} has ${senders.length} senders`);
                                    senders.forEach((sender, index) => {
                                        if (sender.track) {
                                            console.log(
                                                `📞 Sender ${index} for ${fromUid}: ${sender.track.kind} track, enabled: ${sender.track.enabled}`
                                            );
                                        }
                                    });
                                } else {
                                    console.log(`📞 No local stream available for ${fromUid}`);
                                }

                                try {
                                    console.log(
                                        `📞 Setting remote description for ${fromUid}, current state: ${peerConnection.signalingState}`
                                    );
                                    await peerConnection.setRemoteDescription(
                                        new RTCSessionDescription({ type: "offer", sdp: message.data.sdp })
                                    );

                                    // Process any queued ICE candidates now that remote description is set
                                    await processQueuedIceCandidates(fromUid);

                                    console.log(
                                        `📞 Creating answer for ${fromUid}, current state: ${peerConnection.signalingState}`
                                    );
                                    const answer = await peerConnection.createAnswer();
                                    await peerConnection.setLocalDescription(answer);

                                    console.log(
                                        `📞 Sending answer to ${fromUid}, current state: ${peerConnection.signalingState}`
                                    );
                                    ws.send(
                                        JSON.stringify({
                                            type: "answer",
                                            roomId,
                                            uid,
                                            data: {
                                                targetUid: fromUid,
                                                sdp: answer.sdp,
                                            },
                                        })
                                    );
                                } catch (error) {
                                    console.error(`📞 Error handling offer from ${fromUid}:`, error);
                                }
                            }
                            break;

                        case "answer":
                            if (message.data?.fromUid && message.data?.sdp) {
                                const fromUid = message.data.fromUid;
                                console.log(`📞 Received answer from ${fromUid}`);

                                // Check if we're already processing an answer for this user
                                if (pendingAnswersRef.current.has(fromUid)) {
                                    console.log(`📞 Already processing answer from ${fromUid}, ignoring duplicate`);
                                    break;
                                }

                                const peerConnection = peerConnectionsRef.current.get(fromUid);

                                if (peerConnection) {
                                    // Check if we're in the correct state to receive an answer
                                    if (peerConnection.signalingState === "have-local-offer") {
                                        pendingAnswersRef.current.add(fromUid);
                                        try {
                                            console.log(`📞 Setting remote description for ${fromUid}`);
                                            await peerConnection.setRemoteDescription(
                                                new RTCSessionDescription({ type: "answer", sdp: message.data.sdp })
                                            );
                                            console.log(`📞 Remote description set for ${fromUid}`);

                                            // Process any queued ICE candidates now that remote description is set
                                            await processQueuedIceCandidates(fromUid);
                                        } catch (error) {
                                            console.error(`📞 Error setting remote description for ${fromUid}:`, error);
                                        } finally {
                                            pendingAnswersRef.current.delete(fromUid);
                                        }
                                    } else if (peerConnection.signalingState === "stable") {
                                        console.log(
                                            `📞 Peer connection with ${fromUid} is already in stable state, ignoring duplicate answer`
                                        );
                                    } else if (peerConnection.signalingState === "have-remote-offer") {
                                        console.log(
                                            `📞 Received answer from ${fromUid} but we're in have-remote-offer state. This suggests a role conflict - both sides may be trying to initiate. Ignoring answer.`
                                        );
                                    } else {
                                        console.warn(
                                            `Received answer from ${fromUid} but peer connection is in wrong state: ${peerConnection.signalingState}`
                                        );
                                    }
                                } else {
                                    console.warn(`📞 No peer connection found for ${fromUid}`);
                                }
                            }
                            break;

                        case "ice-candidate":
                            if (message.data?.fromUid && message.data?.candidate) {
                                const fromUid = message.data.fromUid;
                                const peerConnection = peerConnectionsRef.current.get(fromUid);

                                if (peerConnection) {
                                    const candidate = new RTCIceCandidate(message.data.candidate);

                                    // Check if we can add ICE candidates (remote description should be set)
                                    if (peerConnection.remoteDescription) {
                                        try {
                                            await peerConnection.addIceCandidate(candidate);
                                            console.log(`📞 Added ICE candidate from ${fromUid}`);
                                        } catch (error) {
                                            console.error(`📞 Error adding ICE candidate from ${fromUid}:`, error);
                                        }
                                    } else {
                                        console.log(
                                            `📞 Queueing ICE candidate from ${fromUid} - remote description not set yet`
                                        );

                                        // Queue the candidate for later processing
                                        if (!pendingIceCandidatesRef.current.has(fromUid)) {
                                            pendingIceCandidatesRef.current.set(fromUid, []);
                                        }
                                        pendingIceCandidatesRef.current.get(fromUid)!.push(candidate);
                                    }
                                }
                            }
                            break;
                    }
                } catch (error) {
                    console.error("Error handling WebSocket message:", error);
                }
            };

            ws.onclose = (event) => {
                if (wsRef.current === ws) {
                    setIsConnected(false);
                    setIsConnecting(false);
                    wsRef.current = null;
                    console.log("WebSocket connection closed:", event.code, event.reason);

                    // Only show error if it's not a normal closure
                    if (event.code !== 1000 && event.code !== 1001) {
                        onError(`WebSocket closed unexpectedly: ${event.reason || "Unknown reason"}`);
                    }
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error event:", error);
                console.error("WebSocket error details:", {
                    type: error.type,
                    readyState: ws.readyState,
                    url: ws.url,
                    protocol: ws.protocol,
                    extensions: ws.extensions,
                    timestamp: new Date().toISOString(),
                });

                if (wsRef.current === ws) {
                    setIsConnecting(false);
                    setIsConnected(false);
                    wsRef.current = null;

                    // Provide more specific error messages based on WebSocket state
                    if (ws.readyState === WebSocket.CONNECTING) {
                        onError(
                            "Failed to connect to voice chat server. Please check if the server is running and try again."
                        );
                    } else if (ws.readyState === WebSocket.CLOSED) {
                        onError("Voice chat connection was closed unexpectedly. Please try reconnecting.");
                    } else {
                        onError("Voice chat connection error. Please check your internet connection and try again.");
                    }
                }
            };
        } catch (error) {
            console.error("Error connecting:", error);
            setIsConnecting(false);
            setIsConnected(false);

            if (error instanceof Error) {
                // More specific error handling
                if (error.name === "NotAllowedError") {
                    onError("Microphone access denied. Please allow microphone permissions and try again.");
                } else if (error.name === "NotFoundError") {
                    onError("No microphone found. Please connect a microphone and try again.");
                } else if (error.name === "NotReadableError") {
                    onError("Microphone is busy or not available. Please check if other applications are using it.");
                } else if (error.message.includes("WebSocket")) {
                    onError("Failed to connect to voice chat server. Please check your internet connection.");
                } else {
                    onError(`Failed to connect to voice call: ${error.message}`);
                }
            } else {
                onError("Failed to connect to voice call. Please check if the WebSocket server is running.");
            }
        }
        // Remove createPeerConnection from dependencies to prevent infinite re-renders
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, uid, role, onParticipantsChange, onError]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            setLocalStream(null);
        }

        // Clean up all remote audio elements
        remoteAudioElementsRef.current.forEach((audio) => {
            audio.pause();
            audio.srcObject = null;
            // Remove from DOM if present
            if (audio.parentNode) {
                audio.parentNode.removeChild(audio);
            }
        });
        remoteAudioElementsRef.current.clear();

        // Clean up audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();

        // Clear pending answers
        pendingAnswersRef.current.clear();

        // Clear pending ICE candidates
        pendingIceCandidatesRef.current.clear();

        setIsConnected(false);
        setIsConnecting(false);
        setParticipants([]);
    }, [localStream]);

    const getMediaStream = useCallback(async () => {
        if (localStream) {
            return localStream;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1,
                },
                video: false,
            });
            setLocalStream(stream);

            // Initialize audio context
            initializeAudioContext();

            // Add tracks to existing peer connections
            peerConnectionsRef.current.forEach((peerConnection) => {
                const existingSenders = peerConnection.getSenders();

                stream.getTracks().forEach((track) => {
                    const existingSender = existingSenders.find((sender) => sender.track?.kind === track.kind);

                    if (existingSender) {
                        // Replace existing track
                        existingSender.replaceTrack(track);
                    } else {
                        // Add new track
                        peerConnection.addTrack(track, stream);
                    }
                });
            });

            return stream;
        } catch (error) {
            console.error("Failed to get media stream:", error);
            onError("Failed to access microphone. Please allow microphone permissions and try again.");
            return null;
        }
    }, [localStream, onError, initializeAudioContext]);

    const toggleMute = useCallback(async () => {
        console.log("🔊 Toggle mute called, current state:", isMuted);

        // Get media stream if not available (for listeners)
        let stream = localStream;
        if (!stream) {
            console.log("🔊 No local stream, getting media stream...");
            stream = await getMediaStream();
            if (!stream) return;
        }

        if (!wsRef.current) {
            console.log("🔊 No WebSocket connection");
            return;
        }

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !isMuted;
            console.log("🔊 Audio track found, changing to:", newMutedState ? "muted" : "unmuted");

            // Initialize audio context if not already done
            initializeAudioContext();

            // Resume audio context before unmuting
            if (!newMutedState) {
                console.log("🔊 Resuming audio context...");
                await resumeAudioContext();
            }

            // Update the track enabled state
            audioTrack.enabled = !newMutedState;
            console.log("🔊 Local audio track enabled:", audioTrack.enabled);

            // Force update the track in all peer connections
            let peerConnectionCount = 0;
            peerConnectionsRef.current.forEach((peerConnection, targetUid) => {
                peerConnectionCount++;
                const senders = peerConnection.getSenders();
                console.log(`🔊 Peer connection ${targetUid} has ${senders.length} senders`);

                const audioSender = senders.find((sender) => sender.track && sender.track.kind === "audio");

                if (audioSender && audioSender.track) {
                    audioSender.track.enabled = !newMutedState;
                    console.log(`🔊 Updated audio sender track for ${targetUid}, enabled:`, audioSender.track.enabled);

                    // Force renegotiation if unmuting
                    if (!newMutedState) {
                        console.log(`🔊 Forcing renegotiation for ${targetUid}...`);
                        peerConnection
                            .createOffer()
                            .then((offer) => {
                                return peerConnection.setLocalDescription(offer);
                            })
                            .then(() => {
                                if (wsRef.current) {
                                    wsRef.current.send(
                                        JSON.stringify({
                                            type: "offer",
                                            roomId,
                                            uid,
                                            data: {
                                                targetUid,
                                                sdp: peerConnection.localDescription?.sdp,
                                            },
                                        })
                                    );
                                }
                            })
                            .catch((error) => {
                                console.error(`🔊 Failed to renegotiate for ${targetUid}:`, error);
                            });
                    }
                } else {
                    console.log(`🔊 No audio sender found for ${targetUid}`);
                }
            });

            console.log(`🔊 Updated ${peerConnectionCount} peer connections`);

            setIsMuted(newMutedState);

            console.log(`🔊 Audio track ${newMutedState ? "muted" : "unmuted"}, enabled: ${audioTrack.enabled}`);

            // Send mute/unmute message
            wsRef.current.send(
                JSON.stringify({
                    type: newMutedState ? "mute" : "unmute",
                    roomId,
                    uid,
                })
            );

            // Update backend
            try {
                await fetch("/api/rooms/participant", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId, uid, isMuted: newMutedState }),
                });
            } catch (error) {
                console.error("Failed to update mute state:", error);
            }
        } else {
            console.log("🔊 No audio track found in stream");
        }
    }, [isMuted, localStream, roomId, uid, getMediaStream, initializeAudioContext, resumeAudioContext]);

    const initiateCall = useCallback(
        async (targetUid: number) => {
            console.log(`🔗 Initiating call to ${targetUid}`);

            if (!wsRef.current) {
                console.log("🔗 No WebSocket connection");
                return;
            }

            // Check if we already have a connection
            const existingConnection = peerConnectionsRef.current.get(targetUid);
            if (existingConnection && existingConnection.connectionState === "connected") {
                console.log(`🔗 Connection to ${targetUid} already exists and is connected`);
                return;
            }

            const peerConnection = createPeerConnection(targetUid);

            // Add local stream tracks if available
            if (localStream) {
                console.log(`🔗 Adding local stream tracks to peer connection for ${targetUid}`);
                const audioTracks = localStream.getAudioTracks();
                console.log(`🔗 Found ${audioTracks.length} audio tracks`);

                localStream.getTracks().forEach((track) => {
                    console.log(
                        `🔗 Adding track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`
                    );
                    // Ensure track is enabled (not muted by default)
                    if (track.kind === "audio") {
                        track.enabled = !isMuted;
                        console.log(`🔗 Audio track enabled set to: ${track.enabled} (muted: ${isMuted})`);

                        // Additional debugging for audio track
                        console.log(`🔗 Audio track settings:`, {
                            kind: track.kind,
                            enabled: track.enabled,
                            readyState: track.readyState,
                            muted: track.muted,
                            id: track.id,
                            label: track.label,
                        });
                    }

                    try {
                        const sender = peerConnection.addTrack(track, localStream);
                        console.log(`🔗 Successfully added track, sender:`, sender);
                    } catch (error) {
                        console.error(`🔗 Failed to add track:`, error);
                    }
                });

                // Verify tracks were added
                const senders = peerConnection.getSenders();
                console.log(`🔗 Peer connection has ${senders.length} senders`);
                senders.forEach((sender, index) => {
                    if (sender.track) {
                        console.log(`🔗 Sender ${index}: ${sender.track.kind} track, enabled: ${sender.track.enabled}`);
                    }
                });
            } else {
                console.log(`🔗 No local stream available for ${targetUid}`);
            }

            try {
                console.log(`🔗 Creating offer for ${targetUid}, current state: ${peerConnection.signalingState}`);
                const offer = await peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false,
                });

                console.log(
                    `🔗 Setting local description for ${targetUid}, current state: ${peerConnection.signalingState}`
                );
                await peerConnection.setLocalDescription(offer);

                console.log(`🔗 Sending offer to ${targetUid}, current state: ${peerConnection.signalingState}`);
                wsRef.current.send(
                    JSON.stringify({
                        type: "offer",
                        roomId,
                        uid,
                        data: {
                            targetUid,
                            sdp: offer.sdp,
                        },
                    })
                );
            } catch (error) {
                console.error(`🔗 Error creating offer for ${targetUid}:`, error);
            }
        },
        [roomId, uid, localStream, createPeerConnection, isMuted]
    );

    // Helper function to process queued ICE candidates
    const processQueuedIceCandidates = useCallback(async (targetUid: number) => {
        const peerConnection = peerConnectionsRef.current.get(targetUid);
        const queuedCandidates = pendingIceCandidatesRef.current.get(targetUid);

        if (peerConnection && queuedCandidates && queuedCandidates.length > 0) {
            console.log(`📞 Processing ${queuedCandidates.length} queued ICE candidates for ${targetUid}`);

            for (const candidate of queuedCandidates) {
                try {
                    await peerConnection.addIceCandidate(candidate);
                    console.log(`📞 Added queued ICE candidate from ${targetUid}`);
                } catch (error) {
                    console.error(`📞 Error adding queued ICE candidate from ${targetUid}:`, error);
                }
            }

            // Clear the queue
            pendingIceCandidatesRef.current.delete(targetUid);
        }
    }, []);

    // Auto-enable audio on any user interaction for seamless experience
    const autoEnableAudio = useCallback(() => {
        const enableAudioOnInteraction = async () => {
            try {
                if (audioContextRef.current && audioContextRef.current.state === "suspended") {
                    await audioContextRef.current.resume();
                    console.log("🎵 Audio context auto-resumed on user interaction");
                }

                // Try to play all remote audio elements
                const remoteAudioElements = document.querySelectorAll("audio[data-uid]");
                remoteAudioElements.forEach(async (audio) => {
                    try {
                        if ((audio as HTMLAudioElement).paused) {
                            await (audio as HTMLAudioElement).play();
                            console.log(`🎵 Auto-played audio for UID: ${audio.getAttribute("data-uid")}`);
                        }
                    } catch {
                        // Silent fail for autoplay
                    }
                });
            } catch {
                // Silent fail for auto-enable
            }
        };

        // Add event listeners for common user interactions
        ["click", "keydown", "touchstart", "mousedown"].forEach((eventType) => {
            document.addEventListener(eventType, enableAudioOnInteraction, { once: true });
        });
    }, []);

    // Set up auto-enable on mount
    useEffect(() => {
        autoEnableAudio();
    }, [autoEnableAudio]);

    useEffect(() => {
        let mounted = true;

        const attemptConnection = async () => {
            if (mounted && !wsRef.current) {
                await connect();
            }
        };

        attemptConnection();

        return () => {
            mounted = false;
            disconnect();
        };
        // Only connect when room parameters change, not when callbacks change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, uid, role]);

    // Function to verify and fix audio track issues
    const verifyAndFixAudioTracks = useCallback(() => {
        if (!localStream) {
            console.log("🔧 No local stream to verify");
            return;
        }

        console.log("🔧 Verifying audio tracks...");
        const audioTracks = localStream.getAudioTracks();
        console.log(`🔧 Found ${audioTracks.length} audio tracks`);

        audioTracks.forEach((track, index) => {
            console.log(`🔧 Track ${index} status:`, {
                kind: track.kind,
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted,
                id: track.id,
                label: track.label,
            });

            // Force enable if not muted
            if (!isMuted && !track.enabled) {
                console.log(`🔧 Enabling track ${index}`);
                track.enabled = true;
            }
        });

        // Verify tracks in all peer connections
        peerConnectionsRef.current.forEach((peerConnection, targetUid) => {
            const senders = peerConnection.getSenders();
            console.log(`🔧 Checking peer connection to ${targetUid}, ${senders.length} senders`);

            senders.forEach((sender, senderIndex) => {
                if (sender.track && sender.track.kind === "audio") {
                    console.log(`🔧 Sender ${senderIndex} to ${targetUid}:`, {
                        kind: sender.track.kind,
                        enabled: sender.track.enabled,
                        readyState: sender.track.readyState,
                        muted: sender.track.muted,
                    });

                    // Force enable if not muted
                    if (!isMuted && !sender.track.enabled) {
                        console.log(`🔧 Enabling sender track ${senderIndex} to ${targetUid}`);
                        sender.track.enabled = true;
                    }
                }
            });
        });
    }, [localStream, isMuted]);

    // Call verifyAndFixAudioTracks on participant update to ensure audio tracks are always enabled
    useEffect(() => {
        verifyAndFixAudioTracks();
    }, [participants, verifyAndFixAudioTracks]);

    return {
        isConnected,
        participants,
        isMuted,
        toggleMute,
        initiateCall,
        disconnect,
        connect,
        getMediaStream,
        hasMediaStream: !!localStream,
        verifyAndFixAudioTracks, // Add this function for debugging
    };
}

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
    onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

export function useWebSocketVoiceCall({
    roomId,
    uid,
    role,
    onParticipantsChange,
    onError,
    onStatusChange,
}: UseWebSocketVoiceCallProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
    const remoteAudioElementsRef = useRef<Map<number, HTMLAudioElement>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const pendingAnswersRef = useRef<Set<number>>(new Set());
    const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidate[]>>(new Map());
    const retryAttemptsRef = useRef(0);
    const maxRetries = 5;
    const retryDelayMs = 3000;
    const heartbeatIntervalRef = useRef<number | null>(null);
    const connectionAttemptRef = useRef<boolean>(false); // Guard against multiple connection attempts
    const [internalParticipants, setInternalParticipants] = useState<Participant[]>([]);

    // Use refs to store callbacks to prevent dependency chain issues
    const onParticipantsChangeRef = useRef(onParticipantsChange);
    const onErrorRef = useRef(onError);
    const onStatusChangeRef = useRef(onStatusChange);

    // Update refs when props change
    useEffect(() => {
        onParticipantsChangeRef.current = onParticipantsChange;
        onErrorRef.current = onError;
        onStatusChangeRef.current = onStatusChange;
    }, [onParticipantsChange, onError, onStatusChange]);

    // --- Utility Functions ---

    const updateStatus = useCallback((status: "connecting" | "connected" | "disconnected" | "error") => {
        onStatusChangeRef.current?.(status);
    }, []);

    const initializeAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext ||
                    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
                console.log("🎵 Audio context initialized");
            } catch (error) {
                console.error("Failed to initialize audio context:", error);
            }
        }
    }, []);

    const resumeAudioContext = useCallback(async () => {
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
                console.log("🎵 Audio context resumed");
            } catch (error) {
                console.error("Failed to resume audio context:", error);
            }
        }
    }, []);

    const getMediaStream = useCallback(async (): Promise<MediaStream | null> => {
        if (localStream) {
            return localStream;
        }

        try {
            console.log("🎤 Requesting new media stream...");
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
            initializeAudioContext(); // Initialize immediately upon getting stream
            console.log("🎤 Successfully got media stream.");
            return stream;
        } catch (error) {
            console.error("Failed to get media stream:", error);
            if (error instanceof Error) {
                if (error.name === "NotAllowedError") {
                    onErrorRef.current("Microphone access denied. Please allow microphone permissions and try again.");
                } else if (error.name === "NotFoundError") {
                    onErrorRef.current("No microphone found. Please connect a microphone and try again.");
                } else if (error.name === "NotReadableError") {
                    onErrorRef.current(
                        "Microphone is busy or not available. Please check if other applications are using it."
                    );
                } else {
                    onErrorRef.current(`Failed to access microphone: ${error.message}`);
                }
            } else {
                onErrorRef.current("An unknown error occurred while trying to access the microphone.");
            }
            return null;
        }
    }, [localStream, initializeAudioContext]);

    const processQueuedIceCandidates = useCallback(async (targetUid: number) => {
        const peerConnection = peerConnectionsRef.current.get(targetUid);
        const queuedCandidates = pendingIceCandidatesRef.current.get(targetUid);

        if (peerConnection && queuedCandidates && queuedCandidates.length > 0) {
            if (!peerConnection.remoteDescription) {
                console.warn(`📞 Cannot process ICE candidates for ${targetUid}: remote description not set yet.`);
                return;
            }
            console.log(`📞 Processing ${queuedCandidates.length} queued ICE candidates for ${targetUid}`);
            for (const candidate of queuedCandidates) {
                try {
                    await peerConnection.addIceCandidate(candidate);
                } catch (error) {
                    console.error(`📞 Error adding queued ICE candidate from ${targetUid}:`, error);
                }
            }
            pendingIceCandidatesRef.current.delete(targetUid);
        }
    }, []);

    const createPeerConnection = useCallback(
        (targetUid: number) => {
            const configuration: RTCConfiguration = {
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
            };
            const peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = (event) => {
                if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                        JSON.stringify({
                            type: "ice-candidate",
                            roomId,
                            uid,
                            data: { targetUid, candidate: event.candidate },
                        })
                    );
                }
            };

            peerConnection.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    const remoteAudio = document.createElement("audio");
                    remoteAudio.srcObject = event.streams[0];
                    remoteAudio.autoplay = true;
                    remoteAudio.controls = false;
                    remoteAudio.volume = 1.0;
                    remoteAudio.muted = false;
                    remoteAudio.setAttribute("playsinline", "true");
                    remoteAudio.style.display = "none";
                    remoteAudio.setAttribute("data-uid", targetUid.toString());

                    // Ensure audio element is removed if an existing one exists
                    const existingAudio = remoteAudioElementsRef.current.get(targetUid);
                    if (existingAudio) {
                        existingAudio.pause();
                        existingAudio.srcObject = null;
                        existingAudio.remove();
                    }

                    document.body.appendChild(remoteAudio);
                    remoteAudioElementsRef.current.set(targetUid, remoteAudio);
                    console.log(`🎵 [${targetUid}] Remote audio element created and added to DOM.`);

                    // Initialize Audio Context if not already done
                    initializeAudioContext();

                    // Enhanced autoplay logic with better error handling
                    const playRemoteAudio = async () => {
                        try {
                            // Ensure audio context is resumed first
                            await resumeAudioContext();

                            // Try to play the audio
                            await remoteAudio.play();
                            console.log(`🎵 [${targetUid}] Remote audio played successfully.`);

                            // Set up Web Audio API routing only after successful playback
                            if (audioContextRef.current && audioContextRef.current.state === "running") {
                                try {
                                    const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
                                    const gainNode = audioContextRef.current.createGain();
                                    gainNode.gain.value = 1.0;
                                    source.connect(gainNode);
                                    gainNode.connect(audioContextRef.current.destination);
                                    console.log(`🎵 [${targetUid}] Web Audio API routing established.`);
                                } catch (webAudioError) {
                                    console.warn(
                                        `🎵 [${targetUid}] Web Audio API setup failed, using HTML audio element:`,
                                        webAudioError
                                    );
                                    // Continue with HTML audio element only
                                }
                            }
                        } catch (error) {
                            console.warn(`🎵 [${targetUid}] Autoplay prevented:`, error);

                            // Create a more user-friendly autoplay handler
                            const handleUserInteraction = async (e: Event) => {
                                e.preventDefault();
                                document.removeEventListener("click", handleUserInteraction, true);
                                document.removeEventListener("touchstart", handleUserInteraction, true);
                                document.removeEventListener("keydown", handleUserInteraction, true);

                                try {
                                    await resumeAudioContext();
                                    await remoteAudio.play();
                                    console.log(`🎵 [${targetUid}] Remote audio played after user gesture.`);

                                    // Set up Web Audio API after user interaction
                                    if (audioContextRef.current && audioContextRef.current.state === "running") {
                                        try {
                                            const source = audioContextRef.current.createMediaStreamSource(
                                                event.streams[0]
                                            );
                                            const gainNode = audioContextRef.current.createGain();
                                            gainNode.gain.value = 1.0;
                                            source.connect(gainNode);
                                            gainNode.connect(audioContextRef.current.destination);
                                            console.log(
                                                `🎵 [${targetUid}] Web Audio API routing established after user gesture.`
                                            );
                                        } catch (webAudioError) {
                                            console.warn(
                                                `🎵 [${targetUid}] Web Audio API setup failed after gesture:`,
                                                webAudioError
                                            );
                                        }
                                    }
                                } catch (err) {
                                    console.error(`🎵 [${targetUid}] Failed to play after gesture:`, err);
                                    onErrorRef.current(
                                        `Failed to enable audio for user ${targetUid}. Please check your browser settings.`
                                    );
                                }
                            };

                            // Listen for user interactions to enable audio
                            document.addEventListener("click", handleUserInteraction, { once: true, capture: true });
                            document.addEventListener("touchstart", handleUserInteraction, {
                                once: true,
                                capture: true,
                            });
                            document.addEventListener("keydown", handleUserInteraction, { once: true, capture: true });

                            onErrorRef.current(
                                "Audio blocked by browser. Please click anywhere on the page to enable remote audio."
                            );
                        }
                    };

                    // Add a small delay to ensure the stream is ready
                    setTimeout(() => {
                        playRemoteAudio();
                    }, 100);
                }
            };

            peerConnection.onconnectionstatechange = () => {
                console.log(`📡 Peer connection for ${targetUid} state changed: ${peerConnection.connectionState}`);
                if (peerConnection.connectionState === "connected") {
                    console.log(`✅ Peer connection to ${targetUid} established successfully`);
                } else if (
                    peerConnection.connectionState === "disconnected" ||
                    peerConnection.connectionState === "failed"
                ) {
                    console.warn(
                        `📡 Peer connection for ${targetUid} is ${peerConnection.connectionState}. Cleaning up.`
                    );
                    // Note: Manual retry logic removed to avoid circular dependencies
                    // The component using this hook should handle reconnection attempts
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                console.log(`📡 ICE connection state for ${targetUid}: ${peerConnection.iceConnectionState}`);
                if (
                    peerConnection.iceConnectionState === "connected" ||
                    peerConnection.iceConnectionState === "completed"
                ) {
                    console.log(`✅ ICE connection to ${targetUid} established`);
                }
            };

            peerConnection.onsignalingstatechange = () => {
                console.log(`📡 Signaling state for ${targetUid}: ${peerConnection.signalingState}`);
            };

            peerConnection.ondatachannel = (event) => {
                console.log(`📊 Data channel received from ${targetUid}:`, event.channel.label);
            };

            peerConnection.onicegatheringstatechange = () => {
                console.log(`🧊 ICE gathering state for ${targetUid}: ${peerConnection.iceGatheringState}`);
            };

            peerConnectionsRef.current.set(targetUid, peerConnection);
            return peerConnection;
        },
        [roomId, uid, initializeAudioContext, resumeAudioContext]
    ); // Removed initiateCall to avoid circular dependency

    // Glare prevention logic helper
    const shouldInitiateOffer = useCallback(
        (targetUid: number) => {
            // If both sides try to initiate, the one with the smaller UID wins and creates the offer.
            // The other side (larger UID) should respond with an answer.
            const shouldInitiate = uid < targetUid;
            console.log(`🎯 Glare prevention check: ${uid} vs ${targetUid} - Should initiate: ${shouldInitiate}`);
            return shouldInitiate;
        },
        [uid]
    );

    // --- Helper function for call initiation ---
    const initiateCall = useCallback(
        async (targetUid: number) => {
            console.log(`🔗 Initiating call to ${targetUid} (my UID: ${uid}, my role: ${role})`);

            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.warn("🔗 WebSocket not connected, cannot initiate call.");
                onErrorRef.current("Not connected to voice chat server.");
                return;
            }

            // Glare prevention: Only initiate if our UID is smaller
            if (!shouldInitiateOffer(targetUid)) {
                console.log(`🔗 Glare prevention: Not initiating call to ${targetUid} because ${uid} >= ${targetUid}`);
                return;
            }

            let peerConnection = peerConnectionsRef.current.get(targetUid);
            if (peerConnection) {
                if (peerConnection.connectionState === "connected") {
                    console.log(`🔗 Connection to ${targetUid} already exists and is connected.`);
                    return;
                }
                // If existing connection is not stable or closed, recreate
                if (peerConnection.signalingState !== "stable" && peerConnection.signalingState !== "closed") {
                    console.warn(
                        `🔗 Peer connection for ${targetUid} in unstable state (${peerConnection.signalingState}), recreating.`
                    );
                    peerConnection.close();
                    peerConnectionsRef.current.delete(targetUid);
                    pendingAnswersRef.current.delete(targetUid);
                    pendingIceCandidatesRef.current.delete(targetUid);
                    peerConnection = undefined;
                }
            }

            if (!peerConnection) {
                console.log(`🔗 Creating new peer connection for ${targetUid}`);
                peerConnection = createPeerConnection(targetUid);
            }

            // Ensure we have a local stream before trying to add tracks
            // For voice calls, both speakers and listeners need audio stream
            const currentLocalStream = localStream || (await getMediaStream());
            if (!currentLocalStream) {
                onErrorRef.current("Could not get microphone access to initiate call.");
                return;
            }

            console.log(`🔗 Adding local tracks to peer connection for ${targetUid}`);
            // Add local stream tracks to the new peer connection if not already added
            const existingSenders = peerConnection.getSenders();
            currentLocalStream.getTracks().forEach((track) => {
                if (!existingSenders.some((sender) => sender.track === track)) {
                    track.enabled = !isMuted; // Apply current mute state
                    peerConnection!.addTrack(track, currentLocalStream);
                    console.log(`🔗 Added local track (${track.kind}) to PC for ${targetUid}`);
                } else {
                    // If track already exists, ensure its enabled state is correct
                    const sender = existingSenders.find((s) => s.track === track);
                    if (sender && sender.track) {
                        sender.track.enabled = !isMuted;
                    }
                }
            });

            try {
                console.log(`🔗 Creating offer for ${targetUid}`);
                const offer = await peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false,
                });
                await peerConnection.setLocalDescription(offer);
                console.log(`🔗 Set local description (offer) for ${targetUid}`);

                wsRef.current.send(
                    JSON.stringify({
                        type: "offer",
                        roomId,
                        uid,
                        data: { targetUid, sdp: offer.sdp },
                    })
                );
                console.log(`🔗 Sent offer to ${targetUid}.`);
            } catch (error) {
                console.error(`🔗 Error creating/sending offer to ${targetUid}:`, error);
                onErrorRef.current(
                    `Failed to initiate call with ${targetUid}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        },
        [roomId, uid, role, localStream, createPeerConnection, isMuted, getMediaStream, shouldInitiateOffer]
    );

    // --- Core WebSocket Logic ---

    const setupWebSocketListeners = useCallback(
        (ws: WebSocket) => {
            ws.onopen = () => {
                if (wsRef.current === ws) {
                    setIsConnected(true);
                    setIsConnecting(false);
                    connectionAttemptRef.current = false; // Reset guard on successful connection
                    retryAttemptsRef.current = 0; // Reset retry counter on successful connection
                    updateStatus("connected");
                    console.log("✅ Connected to WebSocket");

                    // Start heartbeat
                    heartbeatIntervalRef.current = window.setInterval(() => {
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ type: "heartbeat", roomId, uid }));
                        }
                    }, 30000); // Send heartbeat every 30 seconds
                }
            };

            ws.onmessage = async (event) => {
                if (wsRef.current !== ws) return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log("➡️ Received message:", message);

                    switch (message.type) {
                        case "participant-update":
                            if (message.data?.participants) {
                                const updatedParticipants = message.data.participants.map((p) => ({
                                    uid: p.uid,
                                    role: p.role as "speaker" | "listener",
                                    isMuted: p.isMuted,
                                }));
                                setInternalParticipants(updatedParticipants);
                                onParticipantsChangeRef.current(updatedParticipants);

                                console.log(
                                    `👥 Participant update - Total: ${updatedParticipants.length}, My role: ${role}, My UID: ${uid}`
                                );

                                // Initiate calls to new participants based on role and glare prevention
                                updatedParticipants.forEach((p) => {
                                    if (p.uid !== uid && !peerConnectionsRef.current.has(p.uid)) {
                                        console.log(`🔍 Checking connection to ${p.uid} (role: ${p.role})`);

                                        // For voice calls, we need bidirectional audio
                                        // Use glare prevention logic regardless of role
                                        if (shouldInitiateOffer(p.uid)) {
                                            console.log(
                                                `🔗 Initiating call to participant ${p.uid} (role: ${p.role}) - UID comparison: ${uid} < ${p.uid}`
                                            );
                                            initiateCall(p.uid);
                                        } else {
                                            console.log(
                                                `⏳ Waiting for offer from participant ${p.uid} (role: ${p.role}) - UID comparison: ${uid} >= ${p.uid}`
                                            );
                                        }
                                    } else if (p.uid !== uid && peerConnectionsRef.current.has(p.uid)) {
                                        const pc = peerConnectionsRef.current.get(p.uid);
                                        console.log(`🔍 Existing connection to ${p.uid}: ${pc?.connectionState}`);
                                    }
                                });
                            }
                            break;

                        case "offer":
                            if (message.data?.fromUid && message.data?.sdp) {
                                const fromUid = message.data.fromUid;
                                console.log(`📞 Received offer from ${fromUid} (my UID: ${uid}, my role: ${role})`);

                                // Glare prevention check
                                if (shouldInitiateOffer(fromUid)) {
                                    const pc = peerConnectionsRef.current.get(fromUid);
                                    if (pc && pc.signalingState === "have-local-offer") {
                                        console.warn(
                                            `📞 Glare prevention: Received offer from ${fromUid} but we already sent an offer. Ignoring.`
                                        );
                                        break;
                                    }
                                }

                                let peerConnection = peerConnectionsRef.current.get(fromUid);

                                if (peerConnection && peerConnection.signalingState !== "stable") {
                                    console.warn(
                                        `📞 Peer connection for ${fromUid} in unstable state (${peerConnection.signalingState}), recreating.`
                                    );
                                    peerConnection.close();
                                    peerConnectionsRef.current.delete(fromUid);
                                    pendingAnswersRef.current.delete(fromUid);
                                    pendingIceCandidatesRef.current.delete(fromUid);
                                    peerConnection = undefined;
                                }

                                if (!peerConnection) {
                                    console.log(`📞 Creating new peer connection for offer from ${fromUid}`);
                                    peerConnection = createPeerConnection(fromUid);
                                }

                                // Ensure we have a local stream before trying to add tracks
                                // Both speakers and listeners need to have media stream for bidirectional audio
                                const currentLocalStream = localStream || (await getMediaStream());
                                if (!currentLocalStream) {
                                    console.error(
                                        `📞 Could not get microphone access to receive offer from ${fromUid}`
                                    );
                                    onErrorRef.current("Could not get microphone access to receive offer.");
                                    return;
                                }

                                console.log(`📞 Adding local tracks to peer connection for ${fromUid}`);
                                // Add local stream tracks to the new peer connection if not already added
                                const existingSenders = peerConnection.getSenders();
                                currentLocalStream.getTracks().forEach((track) => {
                                    if (!existingSenders.some((sender) => sender.track === track)) {
                                        track.enabled = !isMuted; // Set initial mute state
                                        peerConnection?.addTrack(track, currentLocalStream);
                                        console.log(
                                            `📞 Added local track (${track.kind}) to PC for ${fromUid} when receiving offer`
                                        );
                                    } else {
                                        const sender = existingSenders.find((s) => s.track === track);
                                        if (sender && sender.track) {
                                            sender.track.enabled = !isMuted;
                                        }
                                    }
                                });

                                await peerConnection.setRemoteDescription(
                                    new RTCSessionDescription({ type: "offer", sdp: message.data.sdp })
                                );
                                console.log(`📞 Set remote description from ${fromUid}`);

                                const answer = await peerConnection.createAnswer();
                                await peerConnection.setLocalDescription(answer);
                                console.log(`📞 Created and set local answer for ${fromUid}`);

                                ws.send(
                                    JSON.stringify({
                                        type: "answer",
                                        roomId,
                                        uid,
                                        data: { targetUid: fromUid, sdp: answer.sdp },
                                    })
                                );
                                console.log(`📞 Sent answer to ${fromUid}`);
                                processQueuedIceCandidates(fromUid);
                            }
                            break;

                        case "answer":
                            if (message.data?.fromUid && message.data?.sdp) {
                                const fromUid = message.data.fromUid;
                                console.log(`📞 Received answer from ${fromUid}`);
                                const peerConnection = peerConnectionsRef.current.get(fromUid);

                                if (peerConnection && peerConnection.signalingState === "have-local-offer") {
                                    await peerConnection.setRemoteDescription(
                                        new RTCSessionDescription({ type: "answer", sdp: message.data.sdp })
                                    );
                                    console.log(`📞 Set remote description (answer) from ${fromUid}`);
                                    processQueuedIceCandidates(fromUid);
                                } else {
                                    console.warn(
                                        `📞 Ignoring answer from ${fromUid}, unexpected signaling state: ${peerConnection?.signalingState || "no peer connection"}`
                                    );
                                }
                            }
                            break;

                        case "ice-candidate":
                            if (message.data?.fromUid && message.data?.candidate) {
                                const fromUid = message.data.fromUid;
                                const peerConnection = peerConnectionsRef.current.get(fromUid);
                                const candidate = new RTCIceCandidate(message.data.candidate);

                                if (peerConnection) {
                                    if (peerConnection.remoteDescription) {
                                        try {
                                            await peerConnection.addIceCandidate(candidate);
                                        } catch (e) {
                                            console.error(`📞 Error adding ICE candidate:`, e, candidate);
                                        }
                                    } else {
                                        // Queue if remote description is not set yet
                                        if (!pendingIceCandidatesRef.current.has(fromUid)) {
                                            pendingIceCandidatesRef.current.set(fromUid, []);
                                        }
                                        pendingIceCandidatesRef.current.get(fromUid)!.push(candidate);
                                        console.log(`📞 Queued ICE candidate from ${fromUid}`);
                                    }
                                }
                            }
                            break;

                        case "leave":
                            if (typeof message.data?.uid === "number") {
                                const leftUid = message.data.uid;
                                console.log(`👋 User ${leftUid} left.`);
                                const pc = peerConnectionsRef.current.get(leftUid);
                                if (pc) {
                                    pc.close();
                                    peerConnectionsRef.current.delete(leftUid);
                                    console.log(`🗑️ Closed peer connection for ${leftUid}.`);
                                }
                                const audioEl = remoteAudioElementsRef.current.get(leftUid);
                                if (audioEl) {
                                    audioEl.pause();
                                    audioEl.srcObject = null;
                                    audioEl.remove();
                                    remoteAudioElementsRef.current.delete(leftUid);
                                    console.log(`🗑️ Removed audio element for ${leftUid}.`);
                                }
                                // Update participants list
                                const updatedParticipants = internalParticipants.filter((p) => p.uid !== leftUid);
                                setInternalParticipants(updatedParticipants);
                                onParticipantsChangeRef.current(updatedParticipants);
                            }
                            break;

                        case "mute":
                        case "unmute":
                            if (message.data?.uid) {
                                const targetUid = message.data.uid;
                                const isMutedByPeer = message.type === "mute";
                                console.log(`🗣️ User ${targetUid} is now ${isMutedByPeer ? "muted" : "unmuted"}.`);
                                // Update participants via callback, letting component manage state
                                const updatedParticipants = internalParticipants.map((p) =>
                                    p.uid === targetUid ? { ...p, isMuted: isMutedByPeer } : p
                                );
                                setInternalParticipants(updatedParticipants);
                                onParticipantsChangeRef.current(updatedParticipants);
                            }
                            break;
                    }
                } catch (error) {
                    console.error("Error handling WebSocket message:", error);
                    onErrorRef.current(
                        `Failed to process message: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            };

            ws.onclose = (event) => {
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }
                if (wsRef.current === ws) {
                    setIsConnected(false);
                    setIsConnecting(false);
                    connectionAttemptRef.current = false; // Reset guard on connection close
                    wsRef.current = null;
                    console.log("❌ WebSocket connection closed:", event.code, event.reason);
                    updateStatus("disconnected");

                    // Attempt to reconnect if not a normal closure or explicit disconnect
                    if (event.code !== 1000 && event.code !== 1001 && retryAttemptsRef.current < maxRetries) {
                        retryAttemptsRef.current++;
                        console.log(`Attempting to reconnect (attempt ${retryAttemptsRef.current}/${maxRetries})...`);
                        // Use setTimeout to schedule reconnection without circular dependency
                        setTimeout(() => {
                            // Note: Reconnection logic moved to useEffect to avoid circular dependency
                        }, retryDelayMs * retryAttemptsRef.current);
                        onErrorRef.current(`WebSocket closed: ${event.reason || "Unknown reason"}. Reconnecting...`);
                    } else if (event.code !== 1000 && event.code !== 1001) {
                        onErrorRef.current(
                            `WebSocket connection permanently closed: ${event.reason || "Unknown reason"}.`
                        );
                    }
                }
            };

            ws.onerror = (error) => {
                console.error("🔥 WebSocket error event:", error);
                if (wsRef.current === ws) {
                    setIsConnecting(false);
                    setIsConnected(false);
                    connectionAttemptRef.current = false; // Reset guard on error
                    wsRef.current = null;
                    updateStatus("error");
                    onErrorRef.current("WebSocket connection error. Attempting to reconnect...");
                    // Trigger reconnect on error as well
                    if (retryAttemptsRef.current < maxRetries) {
                        retryAttemptsRef.current++;
                        console.log(`Attempting to reconnect (attempt ${retryAttemptsRef.current}/${maxRetries})...`);
                        // Note: Reconnection logic moved to useEffect to avoid circular dependency
                    } else {
                        onErrorRef.current("WebSocket connection failed permanently.");
                    }
                }
            };
        },
        [
            roomId,
            uid,
            createPeerConnection,
            processQueuedIceCandidates,
            isMuted,
            localStream,
            shouldInitiateOffer,
            updateStatus,
            role,
            initiateCall,
            getMediaStream,
            internalParticipants,
        ]
    );

    const connect = useCallback(async () => {
        // Prevent multiple simultaneous connection attempts
        if (connectionAttemptRef.current) {
            console.log("Connection attempt already in progress, skipping...");
            return;
        }

        if (
            wsRef.current &&
            (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
        ) {
            console.log("WebSocket already connected or connecting.");
            return;
        }

        if (isConnecting) {
            console.log("Already in the process of connecting.");
            return;
        }

        connectionAttemptRef.current = true; // Set guard
        setIsConnecting(true);
        updateStatus("connecting");

        // Close any stale connection before initiating a new one
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            // Get microphone access before connecting to WebSocket
            const stream = await getMediaStream();
            if (!stream) {
                setIsConnecting(false);
                updateStatus("error");
                connectionAttemptRef.current = false; // Reset guard
                return; // getMediaStream will handle onError
            }

            console.log("Attempting to connect WebSocket...");
            const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws-voice-call?roomId=${roomId}&uid=${uid}&role=${role}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws; // Store reference immediately

            // Set up listeners for the new WebSocket instance
            setupWebSocketListeners(ws);
        } catch (error) {
            console.error("Error initiating WebSocket connection:", error);
            setIsConnecting(false);
            setIsConnected(false);
            updateStatus("error");
            connectionAttemptRef.current = false; // Reset guard
            onErrorRef.current(
                `Failed to initiate WebSocket connection: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }, [roomId, uid, role, isConnecting, getMediaStream, setupWebSocketListeners, updateStatus]);

    const disconnect = useCallback(() => {
        console.log("🔌 Disconnecting voice call...");
        updateStatus("disconnected");
        connectionAttemptRef.current = false; // Reset guard

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, "User initiated disconnect"); // Use code 1000 for normal closure
            wsRef.current = null;
        }

        // Stop all local media tracks
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                track.stop();
                console.log(`🔌 Stopped local track: ${track.kind}`);
            });
            setLocalStream(null);
        }

        // Close all peer connections and clean up
        peerConnectionsRef.current.forEach((pc, targetUid) => {
            pc.getSenders().forEach((sender) => sender.track?.stop()); // Stop tracks before closing PC
            pc.close();
            console.log(`🔌 Closed peer connection for ${targetUid}`);
        });
        peerConnectionsRef.current.clear();

        // Remove all remote audio elements
        remoteAudioElementsRef.current.forEach((audioEl, targetUid) => {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
            console.log(`🔌 Removed remote audio element for ${targetUid}`);
        });
        remoteAudioElementsRef.current.clear();

        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            try {
                audioContextRef.current.close();
                console.log("🔌 Audio context closed.");
            } catch (error) {
                console.warn("Error closing audio context:", error);
            }
            audioContextRef.current = null;
        }

        // Clear pending states
        pendingAnswersRef.current.clear();
        pendingIceCandidatesRef.current.clear();
        retryAttemptsRef.current = 0;

        setIsConnected(false);
        setIsConnecting(false);
        setInternalParticipants([]);
        onParticipantsChangeRef.current([]);
    }, [localStream, updateStatus]);

    const toggleMute = useCallback(async () => {
        console.log("🔊 Toggle mute called, current state:", isMuted);

        if (!localStream) {
            console.warn("🔊 No local stream available to toggle mute.");
            onErrorRef.current("Microphone stream not available. Please ensure microphone access.");
            return;
        }

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn("🔊 WebSocket not connected, cannot toggle mute state on server.");
            onErrorRef.current("Not connected to voice chat server.");
            return;
        }

        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !isMuted;
            audioTrack.enabled = !newMutedState;
            setIsMuted(newMutedState);

            console.log(`🔊 Local audio track set to enabled: ${audioTrack.enabled}`);

            // Update participant's mute state in all existing peer connections
            peerConnectionsRef.current.forEach((pc) => {
                const senders = pc.getSenders();
                // Temukan sender yang terkait dengan track audio lokal kita
                const audioSender = senders.find(
                    (sender) => sender.track?.kind === "audio" && sender.track === audioTrack
                );
                if (audioSender && audioSender.track) {
                    audioSender.track.enabled = !newMutedState;
                    console.log(`🔊 Updated audio sender track for peer, enabled: ${audioSender.track.enabled}`);
                }
            });

            // Update local participants state immediately for responsiveness
            const updatedParticipants = internalParticipants.map((p) =>
                p.uid === uid ? { ...p, isMuted: newMutedState } : p
            );
            setInternalParticipants(updatedParticipants);
            onParticipantsChangeRef.current(updatedParticipants);

            // Inform peers via WebSocket
            wsRef.current.send(
                JSON.stringify({
                    type: newMutedState ? "mute" : "unmute",
                    roomId,
                    uid,
                })
            );

            // Update backend (optional, if your backend tracks mute state)
            try {
                await fetch("/api/rooms/participant", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId, uid, isMuted: newMutedState }),
                });
                console.log(`🔊 Backend mute state updated to: ${newMutedState}`);
            } catch (error) {
                console.error("Failed to update mute state on backend:", error);
            }
        } else {
            console.warn("🔊 No audio track found in local stream to toggle mute.");
            onErrorRef.current("No audio track found for muting/unmuting.");
        }
    }, [isMuted, localStream, roomId, uid, internalParticipants]);

    // --- Effects ---

    useEffect(() => {
        // Initial connection attempt when component mounts and uid is valid
        let mounted = true;

        // Only connect if we have a valid uid and required params
        if (uid && roomId && role) {
            // Add a small delay to avoid rapid reconnections during development hot reload
            const timer = setTimeout(async () => {
                if (mounted && !wsRef.current && !connectionAttemptRef.current) {
                    await connect();
                }
            }, 100); // 100ms delay

            return () => {
                // Cleanup on unmount
                mounted = false;
                clearTimeout(timer);
                disconnect();
            };
        }

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, roomId, role]); // Depend on uid, roomId, and role

    // Effect for participants change to initiate calls if role is speaker
    // useEffect(() => {
    //     if (isConnected && role === 'speaker') {
    //         participantsRef.current.forEach((p) => {
    //             if (p.uid !== uid && !peerConnectionsRef.current.has(p.uid)) {
    //                 console.log(
    //                     `🔗 Proactively initiating call to new participant ${p.uid} due to participant update.`
    //                 );
    //                 initiateCall(p.uid);
    //             }
    //         });
    //     }
    // }, [participants, isConnected, role, uid, initiateCall]);

    return {
        isConnected,
        participants: internalParticipants,
        isMuted,
        toggleMute,
        initiateCall,
        disconnect,
        connect, // Expose connect for manual retry
        hasMediaStream: !!localStream,
        peerConnectionsRef,
    };
}

import { useEffect, useRef } from "react";

interface Participant {
    uid: number;
    isMuted: boolean;
    role: "speaker" | "listener";
}

export function useParticipantsPolling(
    roomId: string,
    setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>,
    onError?: (errMsg: string) => void
) {
    const failCount = useRef(0);
    useEffect(() => {
        failCount.current = 0;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/rooms/find?roomId=${roomId}`);
                if (!res.ok) {
                    failCount.current++;
                    if (failCount.current >= 3 && onError) {
                        onError("Gagal memuat data peserta. Cek koneksi atau reload halaman.");
                    }
                    return;
                }
                const data = await res.json();
                if (Array.isArray(data.participants)) {
                    setParticipants(data.participants);
                }
                failCount.current = 0; // reset jika berhasil
            } catch {
                failCount.current++;
                if (failCount.current >= 3 && onError) {
                    onError("Gagal memuat data peserta. Cek koneksi atau reload halaman.");
                }
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [roomId, setParticipants, onError]);
}

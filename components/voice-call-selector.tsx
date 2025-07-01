"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Headphones, Loader2, AlertCircle } from "lucide-react";

type Role = "listener" | "speaker";

export function VoiceCallSelector() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateCall = async () => {
        console.log("handleCreateCall executed with role:", selectedRole);
        if (selectedRole !== "listener") return;

        setIsLoading(true);
        setError(null);

        try {
            const roomId = uuidv4();
            const response = await fetch("/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ roomId, role: selectedRole }),
            });

            if (!response.ok) {
                throw new Error("Gagal membuat ruang");
            }

            await response.json();

            router.push(`/voice-call/${roomId}?role=${selectedRole}`);
        } catch (err) {
            console.error("Error starting call:", err);
            setError("Gagal memulai call. Silakan coba lagi.");
            setIsLoading(false);
        }
    };

    const handleFindCall = async () => {
        console.log("handleFindCall executed with role:", selectedRole);
        if (selectedRole !== "speaker") return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/rooms/find");

            if (!response.ok) {
                if (response.status === 404) {
                    setError("Tidak ada ruang yang tersedia. Silakan coba lagi nanti.");
                } else {
                    throw new Error("Gagal menemukan ruang");
                }
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            router.push(`/voice-call/${data.roomId}?role=${selectedRole}`);
        } catch (err) {
            console.error("Error finding call:", err);
            setError("Terjadi kesalahan. Silakan coba lagi.");
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-2">
            <CardHeader>
                <CardTitle className="text-center">Bergabung atau Mulai Call</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 text-center">
                    <p className="text-muted-foreground">Pilih peranmu untuk memulai.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setSelectedRole("speaker")}
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${selectedRole === "speaker" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                    >
                        <Mic className="h-8 w-8 mb-2" />
                        <span className="font-medium">Speaker</span>
                        <span className="text-sm text-muted-foreground">Saya ingin bercerita</span>
                    </button>

                    <button
                        onClick={() => setSelectedRole("listener")}
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${selectedRole === "listener" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                    >
                        <Headphones className="h-8 w-8 mb-2" />
                        <span className="font-medium">Listener</span>
                        <span className="text-sm text-muted-foreground">Saya ingin mendengarkan</span>
                    </button>
                </div>

                {selectedRole === "listener" && (
                    <Button className="w-full" size="lg" onClick={handleCreateCall} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memulai Panggilan...
                            </>
                        ) : (
                            "Mulai Panggilan Baru"
                        )}
                    </Button>
                )}

                {selectedRole === "speaker" && (
                    <Button className="w-full" size="lg" onClick={handleFindCall} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Mencari Ruang...
                            </>
                        ) : (
                            "Cari Ruang"
                        )}
                    </Button>
                )}

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <p className="text-xs text-center text-muted-foreground">
                    Suara Anda akan menjadi anonim. Tidak ada informasi pribadi yang dibagikan.
                </p>
            </CardContent>
        </Card>
    );
}

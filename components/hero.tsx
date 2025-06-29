"use client";
import { Button } from "@/components/ui/button";
import { Ear, Mic } from "lucide-react";
import React from "react";
import { TextAnimate } from "./magicui/text-animate";
import { WordRotate } from "./magicui/word-rotate";
import { Particles } from "./ui/particles";
import { useRouter } from "next/navigation";

const Hero = () => {
    const router = useRouter();
    return (
        <div
            id="Home"
            className="relative min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center py-20 px-4 sm:py-32 sm:px-8"
        >
            <div className="absolute inset-0 z-[-1]">
                <Particles
                    className="w-full h-full"
                    quantity={100}
                    staticity={50}
                    ease={50}
                    size={0.4}
                    refresh={true}
                    color="#ffffff"
                    vx={0}
                    vy={0}
                />
            </div>
            <div className="flex items-center justify-center w-full">
                <div className="text-center w-full max-w-2xl">
                    <WordRotate
                        words={["Kamu Lagi Ada Masalah?", "Butuh Teman Cerita?", "Butuh Dukungan?"]}
                        className="mt-6 max-w-[20ch] text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold !leading-[1.2] tracking-tight mx-auto lg:mx-1"
                    />
                    <TextAnimate
                        animation="blurInUp"
                        by="word"
                        duration={5}
                        once={true}
                        className="mt-6 max-w-[60ch] text-base xs:text-lg sm:text-lg md:text-lg break-words mx-auto lg:mx-1"
                    >
                        Anggap saja ini safe space untukmu, tempat kamu bisa menumpahkan semua isi hati yang terpendam.
                        Di sini, kamu boleh menjadi dirimu seutuhnya, tanpa perlu memakai topeng. Lepaskan saja
                        semuanya, karena kamu akan menemukan seseorang yang siap mengerti, bukan menghakimi.
                    </TextAnimate>
                    <div className="mt-12 flex flex-col sm:flex-row items-center sm:justify-center gap-4 w-full">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto rounded-full text-base flex items-center justify-center"
                            onClick={() => router.push("/login")}
                        >
                            Aku Ingin Bercerita <Mic className="!h-5 !w-5 ml-2" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto rounded-full text-base flex items-center justify-center"
                            onClick={() => router.push("/login")}
                        >
                            Aku Siap Mendengarkan <Ear className="!h-5 !w-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;

import { Shield, HeartHandshake, Headphones, Lock, ToggleRight, CheckCircle } from "lucide-react";
import React from "react";

const promises = [
    {
        icon: Shield,
        title: "Anonimitas Mutlak",
        description:
            "Kamu adalah jiwa, bukan nama. Kami tidak akan pernah meminta data pribadimu yang bisa mengidentifikasi dirimu. Ceritamu aman di sini, terlepas dari siapa kamu di dunia luar.",
    },
    {
        icon: HeartHandshake,
        title: "Ruang Bebas Penghakiman",
        description:
            "Apapun ceritamu, seberat atau 'seremeh' apapun menurutmu, akan kami terima dengan tangan terbuka. Tidak akan ada yang menyalahkan, meremehkan, atau memberimu nasihat yang tidak kamu minta.",
    },
    {
        icon: Headphones,
        title: "Empati Murni",
        description:
            "Tujuan kami bukan untuk 'memperbaiki' dirimu, karena kamu tidak 'rusak'. Tujuan kami adalah untuk duduk bersamamu di dalam perasaanmu, untuk benar-benar mengerti apa yang sedang kamu alami.",
    },
    {
        icon: Lock,
        title: "Privasi Datamu Adalah Segalanya",
        description:
            "Percakapanmu adalah milikmu. Kami menggunakan enkripsi dan tidak akan pernah menjual atau membagikan datamu kepada pihak ketiga untuk tujuan komersial. Kepercayaanmu adalah aset terbesar kami.",
    },
    {
        icon: ToggleRight,
        title: "Kamu Selalu Pegang Kendali",
        description:
            "Kamu boleh memulai, berhenti sejenak, atau mengakhiri percakapan kapan saja, tanpa perlu penjelasan. Jika kamu merasa tidak nyaman, satu tombol 'Hentikan Sesi' akan langsung membawamu kembali ke ruang amanmu. Kamu yang berkuasa.",
    },
    {
        icon: CheckCircle,
        title: "Semua Perasaan Itu Valid",
        description:
            "Tidak ada perasaan yang terlalu kecil atau dianggap 'drama'. Rasa kecewa karena hal sepele sama pentingnya dengan rasa duka yang mendalam. Di sini, semua perasaanmu diakui dan diberi ruang.",
    },
];

const Promises = () => {
    return (
        <div id="promises" className="w-full py-25 xs:py-20 px-6">
            <h2 className="text-3xl xs:text-4xl sm:text-5xl font-bold tracking-tight text-center">
                Enam Pilar Kepercayaan TellMe
            </h2>
            <p className="mt-3 xs:text-lg text-center text-muted-foreground">
                Janji kami untukmu, sebagai Pencerita dan Pendengar
            </p>
            <div className="w-full max-w-screen-lg mx-auto mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {promises.map((promise) => (
                    <div key={promise.title} className="flex flex-col bg-background border rounded-xl py-6 px-5">
                        <div className="mb-3 h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                            <promise.icon className="h-6 w-6" />
                        </div>
                        <span className="text-lg font-semibold">{promise.title}</span>
                        <p className="mt-1 text-foreground/80 text-[15px]">{promise.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Promises;

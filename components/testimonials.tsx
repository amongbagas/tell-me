import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Marquee from "@/components/ui/marquee";
import Link from "next/link";
import React, { ComponentProps } from "react";

const testimonials = [
    {
        id: 1,
        name: "Kertas Kusut",
        designation: "Mahasiswa Tingkat Akhir",
        company: "Kewalahan oleh Tuntutan",
        testimonial:
            "Tugas akhir bikin kepalaku mau pecah. Di sini aku bisa ngeluhin semuanya tanpa henti, dan Pendengarnya sabar banget. Nggak ada yang bilang 'semangat ya', cuma 'aku paham, itu pasti berat'. Lega banget.",
        avatar: "https://picsum.photos/seed/kertas/200",
    },
    {
        id: 2,
        name: "Jendela Hujan",
        designation: "Hati yang Baru Patah",
        company: "Menghadapi Rasa Sepi",
        testimonial:
            "Baru putus dan rasanya malu mau cerita ke teman. Di TellMe, aku bisa nangis lewat chat dan cerita sejujur-jujurnya karena tahu nggak ada yang kenal aku. Benar-benar ngebantu.",
        avatar: "https://picsum.photos/seed/hujan/200",
    },
    {
        id: 3,
        name: "Lilin Kecil",
        designation: "Pejuang Tengah Malam",
        company: "Saat Dunia Terlelap",
        testimonial:
            "Jam 1 pagi, overthinking nggak karuan. Iseng buka ini dan ternyata ada yang langsung balas. Cuma ngobrol ngalor-ngidul tapi rasanya ditemenin itu... tak ternilai.",
        avatar: "https://picsum.photos/seed/lilin/200",
    },
    {
        id: 4,
        name: "Langit Mendung",
        designation: "Saat Kata Tak Terucap",
        company: "Kehabisan Energi",
        testimonial:
            "Lagi nggak sanggup ngetik atau jelasin apa-apa. Aku cuma pakai fitur 'Suara Hati' dan kirim rekaman helaan napas panjang. Balasannya, 'Aku dengar lelahmu. Nggak apa-apa, bernapas dulu aja.' Aku sampai terharu.",
        avatar: "https://picsum.photos/seed/mendung/200",
    },
    {
        id: 5,
        name: "Topeng Porselen",
        designation: "Selalu Terlihat 'On'",
        company: "Di Balik Senyum",
        testimonial:
            "Di depan teman-teman, aku harus selalu kelihatan 'on'. Di sini, aku akhirnya bisa bilang 'aku capek banget' tanpa takut dicap lemah atau negatif. Di sini, aku boleh nggak baik-baik aja.",
        avatar: "https://picsum.photos/seed/topeng/200",
    },
    {
        id: 6,
        name: "Pintu Ragu",
        designation: "Yang Awalnya Skeptis",
        company: "Memberanikan Diri",
        testimonial:
            "Awalnya aku skeptis, 'ngapain curhat sama orang asing?'. Ternyata salah besar. Pengalaman pertamaku dapat Pendengar yang sangat baik dan menghargai ceritaku. Ini beda.",
        avatar: "https://picsum.photos/seed/pintu/200",
    },
];

const Testimonials = () => (
    <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
            <h2 className="mb-8 text-3xl font-bold tracking-tight text-center sm:text-4xl md:mb-12 lg:text-5xl">
                Testimonials
            </h2>
            <div className="relative">
                <div className="absolute left-0 inset-y-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-1" />
                <div className="absolute right-0 inset-y-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-1" />
                <Marquee pauseOnHover className="[--duration:50s] py-4">
                    <TestimonialList />
                </Marquee>
                <Marquee pauseOnHover reverse className="[--duration:50s] py-4">
                    <TestimonialList />
                </Marquee>
            </div>
        </div>
    </section>
);

const TestimonialList = () =>
    testimonials.map((testimonial) => (
        <div
            key={testimonial.id}
            className="w-[300px] sm:w-[350px] md:w-[400px] mx-2 bg-accent rounded-xl p-6 flex-shrink-0"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarFallback className="text-xl font-medium bg-primary text-primary-foreground">
                            {testimonial.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-lg font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.designation}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                    <Link href="#" target="_blank">
                        <TwitterLogo className="w-4 h-4" />
                    </Link>
                </Button>
            </div>
            <p className="mt-5 text-sm sm:text-base md:text-[17px] leading-relaxed">{testimonial.testimonial}</p>
        </div>
    ));

const TwitterLogo = (props: ComponentProps<"svg">) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>X</title>
        <path
            fill="currentColor"
            d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
        />
    </svg>
);

export default Testimonials;

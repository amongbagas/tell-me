import { HelpCircle, EyeOff, Users, Gift, ShieldAlert, ArrowRightLeft } from "lucide-react";

const faq = [
    {
        icon: HelpCircle,
        question: "Apa itu TellMe? Apakah ini layanan terapi?",
        answer: "TellMe adalah platform dukungan sebaya (peer support), bukan layanan terapi. Kami menyediakan ruang aman di mana kamu bisa terhubung secara anonim dengan pendengar sukarela yang terlatih untuk mendengarkan dengan empati, bukan untuk memberikan diagnosis atau terapi profesional.",
    },
    {
        icon: EyeOff,
        question: "Seberapa anonimkah platform ini?",
        answer: "Sangat anonim. Kami tidak pernah meminta nama asli, email, atau data pribadi lainnya. Saat memulai sesi, kamu akan diberi nama samaran acak. Kami mendesain sistem ini agar kamu bisa merasa sebebas mungkin untuk menjadi jujur.",
    },
    {
        icon: Users,
        question: "Siapa para 'Pendengar' di sini?",
        answer: "Para Pendengar adalah anggota komunitas kami yang secara sukarela mendedikasikan waktunya. Mereka datang dari berbagai latar belakang, namun memiliki satu kesamaan: keinginan tulus untuk membantu. Setiap calon Pendengar harus memahami dan menyetujui Kode Etik Komunitas kami.",
    },
    {
        icon: Gift,
        question: "Apakah layanan ini sepenuhnya gratis?",
        answer: "Iya, layanan inti kami untuk bercerita dan mendengarkan akan selalu 100% gratis. Kami mungkin akan menawarkan fitur premium opsional di masa depan untuk mendukung operasional, namun fitur utama untuk saling terhubung akan tetap bisa diakses siapa saja, kapan saja.",
    },
    {
        icon: ShieldAlert,
        question: "Apa yang harus aku lakukan jika merasa tidak nyaman saat sesi?",
        answer: "Keamananmu adalah prioritas nomor satu. Di setiap ruang obrolan, ada tombol 'Hentikan Sesi' yang bisa kamu tekan kapan saja tanpa perlu memberi penjelasan. Sesi akan langsung berakhir dan kamu bisa melaporkan pengguna tersebut jika dirasa perlu. Kamu selalu pegang kendali.",
    },
    {
        icon: ArrowRightLeft,
        question: "Bisakah aku menjadi 'Pencerita' dan juga 'Pendengar'?",
        answer: "Tentu saja! Kami sangat mendorong hal itu. Kamu bisa dengan mudah mengganti peranmu melalui dasbor. Terkadang, salah satu cara terbaik untuk pulih adalah dengan hadir untuk orang lain. Ekosistem empati ini berjalan dua arah.",
    },
];

const FAQ = () => {
    return (
        <div id="faq" className="min-h-screen flex items-center justify-center px-6 py-25 xs:py-20">
            <div className="max-w-screen-lg">
                <h2 className="text-3xl xs:text-4xl md:text-5xl !leading-[1.15] font-bold tracking-tight text-center">
                    Frequently Asked Questions
                </h2>
                <p className="mt-3 xs:text-lg text-center text-muted-foreground">
                    Jawaban atas pertanyaan umum seputar TellMe
                </p>

                <div className="mt-12 grid md:grid-cols-2 bg-background rounded-xl overflow-hidden outline-[1px] outline-border outline-offset-[-1px]">
                    {faq.map(({ question, answer, icon: Icon }) => (
                        <div key={question} className="border p-6 -mt-px -ml-px">
                            <div className="h-8 w-8 xs:h-10 xs:w-10 flex items-center justify-center rounded-full bg-accent">
                                <Icon className="h-4 w-4 xs:h-6 xs:w-6" />
                            </div>
                            <div className="mt-3 mb-2 flex items-start gap-2 text-lg xs:text-[1.35rem] font-semibold tracking-tight">
                                <span>{question}</span>
                            </div>
                            <p className="text-sm xs:text-base">{answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FAQ;

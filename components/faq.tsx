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
        answer: "Interaksi Anda di sini anonim. Untuk melindungi akun Anda, kami menggunakan email hanya untuk keperluan autentikasi dan keamanan. Email Anda tidak akan pernah kami tampilkan secara publik. Saat memulai sesi, Anda akan berinteraksi menggunakan nama samaran acak, bukan nama asli atau email Anda. Kami mendesain sistem ini agar Anda bisa merasa sebebas mungkin untuk menjadi jujur.",
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
        <div id="faq" className="w-full py-25 xs:py-20 px-6">
            <h2 className="text-3xl xs:text-4xl md:text-5xl !leading-[1.15] font-bold tracking-tight text-center">
                Frequently Asked Questions
            </h2>
            <p className="mt-3 xs:text-lg text-center text-muted-foreground">
                Jawaban atas pertanyaan umum seputar TellMe
            </p>

            <div className="w-full max-w-screen-lg mx-auto mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {faq.map(({ question, answer, icon: Icon }) => (
                    <div key={question} className="flex flex-col bg-background border rounded-xl py-6 px-5">
                        <div className="mb-3 h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                            <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-lg font-semibold">{question}</span>
                        <p className="mt-1 text-foreground/80 text-[15px]">{answer}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FAQ;

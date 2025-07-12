# Tell Me - Ruang Aman untuk Didengarkan

<div align="center">
  <img src="https://raw.githubusercontent.com/amongbagas/tell-me/main/public/tellme.svg" alt="Tell Me Logo" width="150">
</div>

<p align="center">
  Platform dukungan sebaya (<em>peer support</em>) anonim berbasis suara yang dibangun dengan tumpukan teknologi modern. Tell Me menyediakan ruang di mana pengguna dapat terhubung untuk berbagi cerita atau mendengarkan, sepenuhnya anonim dan tanpa penghakiman.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs" alt="Next.js">
  <img src="https://img.shields.io/badge/Drizzle-ORM-brightgreen?style=for-the-badge&logo=drizzle" alt="Drizzle ORM">
  <img src="https://img.shields.io/badge/WEB-RTC-blue?style=for-the-badge&logo=webrtc" alt="Web RTC">
  <img src="https://img.shields.io/badge/Auth-Better--Auth-orange?style=for-the-badge" alt="Better-Auth">
  <img src="https://img.shields.io/badge/Styling-TailwindCSS-blueviolet?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/shadcn-ui-blue?style=for-the-badge&logo=shadcn" alt="shadcn-ui">
  <img src="https://img.shields.io/badge/Deployment-Vercel-blue?style=for-the-badge&logo=vercel" alt="Vercel">
</p>

## ✨ Latar Belakang

Terkadang, hal yang paling kita butuhkan adalah didengarkan. Bukan dinasihati, bukan dihakimi, tapi hanya didengarkan oleh seseorang yang tulus hadir. "Tell Me" lahir dari kebutuhan ini. Kami menciptakan sebuah platform di mana setiap orang bisa menemukan telinga yang simpatik untuk menumpahkan isi hati, atau sebaliknya, menjadi pendengar yang baik bagi orang lain—semuanya dalam sebuah lingkungan yang aman, anonim, dan suportif.

## 🚀 Fitur Utama

- **📞 Panggilan Suara Anonim:** Terhubung dengan pengguna lain melalui panggilan suara real-time yang aman menggunakan **WebRTC**. Identitas Anda sepenuhnya terlindungi.
- **🎭 Sistem Peran (Speaker & Listener):** Pengguna dapat memilih peran sebagai 'Speaker' (ingin bercerita) atau 'Listener' (siap mendengarkan), menciptakan sesi percakapan yang terstruktur.
- **🤝 Pencarian Ruangan Cerdas:** 'Listener' dapat membuat ruang tunggu, dan 'Speaker' dapat dengan mudah menemukan ruang yang tersedia untuk segera memulai percakapan.
- **🔐 Otentikasi Aman & Fleksibel:** Sistem otentikasi lengkap menggunakan **Better-Auth**, mendukung pendaftaran/login via Google dan email/password, termasuk fungsionalitas lupa/reset password.
- **✨ Antarmuka Modern & Interaktif:** Dibangun dengan **Next.js 15 App Router** dan dihias dengan **Tailwind CSS** & **shadcn/ui**. Dilengkapi dengan animasi elegan dari **Framer Motion** dan komponen **Magic UI** untuk pengalaman pengguna yang menyenangkan.
- **🔧 Arsitektur Fleksibel:** Menggunakan **Drizzle ORM** dengan database **PostgreSQL (Neon)**, memastikan kueri yang aman dan performa tinggi dalam lingkungan serverless.

## 🛠️ Teknologi yang Digunakan

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Animasi:** Framer Motion, Magic UI (Word Rotate, Sparkles Text)
- **Database & ORM:** PostgreSQL (Neon) & Drizzle ORM
- **Otentikasi:** Better-Auth
- **Panggilan Suara Real-time:** WEB RTC
- **Pengiriman Email:** Resend (untuk reset password)
- **Deployment:** Vercel

## ⚙️ Memulai Proyek Secara Lokal

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di lingkungan lokal Anda.

### 1. Prasyarat

- Node.js (versi 18.18.0 atau lebih tinggi)
- npm, yarn, atau pnpm

### 2. Instalasi

1.  **Clone repositori ini:**

    ```bash
    git clone [https://github.com/amongbagas/tell-me.git](https://github.com/amongbagas/tell-me.git)
    cd tell-me
    ```

2.  **Install dependensi:**

    ```bash
    npm install
    ```

3.  **Buat file `.env`:**
    Salin isi dari `.env.example` (jika ada) atau buat file `.env` baru di root proyek dan isi dengan variabel lingkungan yang diperlukan.

    ```env
    # URL Database (contoh: Neon)
    DATABASE_URL="postgres://..."

    # WebSocket Configuration
    NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:PORT"
    WEBSOCKET_PORT="PORT"

    # Kredensial Better-Auth & Google
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"
    BETTER_AUTH_URL="http://localhost:3000" # URL dasar untuk callback otentikasi

    # Kredensial Resend (untuk email)
    RESEND_API_KEY="your_resend_api_key"
    EMAIL_SENDER_NAME="Tell Me"
    EMAIL_SENDER_ADDRESS="noreply@yourdomain.com"
    ```

    - Anda bisa mendapatkan kredensial ini dari masing-masing layanan: [Neon](https://neon.tech), [Google Cloud Console](https://console.cloud.google.com/), dan [Resend](https://resend.com/).

4.  **Jalankan Migrasi Database:**
    Drizzle Kit akan menggunakan skema di `db/schema.ts` untuk membuat dan menerapkan migrasi ke database Anda.

    ```bash
    npm run drizzle:migrate # Anda mungkin perlu menambahkan skrip ini di package.json
    # atau langsung
    npx drizzle-kit push
    ```

5.  **Jalankan server pengembangan:**

    **Untuk fitur lengkap termasuk panggilan suara:**

    ```bash
    npm run dev-full
    ```

    **Atau hanya untuk pengembangan frontend:**

    ```bash
    npm run dev
    ```

    **Untuk memulai hanya WebSocket server:**

    ```bash
    npm run start-websocket
    ```

    **Untuk test koneksi WebSocket:**

    ```bash
    npm run test-websocket
    ```

    > **Catatan:** Gunakan `npm run dev-full` untuk menjalankan both Next.js dev server dan WebSocket server secara bersamaan. Ini diperlukan untuk fitur panggilan suara yang berfungsi penuh.

### 🔧 Troubleshooting WebSocket

Jika Anda mengalami masalah dengan koneksi WebSocket (error: "WebSocket error: {}"), baca panduan lengkap di [WEBSOCKET_TROUBLESHOOTING.md](./WEBSOCKET_TROUBLESHOOTING.md).

**Solusi cepat:**

1. Pastikan WebSocket server berjalan: `npm run start-websocket`
2. Test koneksi: `npm run test-websocket`
3. Gunakan `npm run dev-full` untuk pengembangan

4. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 🤝 Kontribusi

Kontribusi sangat kami hargai! Jika Anda ingin berkontribusi, silakan fork repositori ini dan buat _pull request_. Untuk perubahan besar, mohon buka _issue_ terlebih dahulu untuk mendiskusikan apa yang ingin Anda ubah.

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk detail lebih lanjut.

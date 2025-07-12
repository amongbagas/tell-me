# Docker Deployment untuk Tell Me Project

## Persyaratan

- Docker Desktop atau Docker Engine
- Docker Compose

## Setup Awal

1. **Copy file environment variables:**

    ```bash
    cp .env.docker .env
    ```

2. **Edit file `.env` dan update nilai-nilai berikut:**
    - `BETTER_AUTH_SECRET`: Ganti dengan secret key yang aman
    - `GOOGLE_CLIENT_ID`: ID Google OAuth Anda
    - `GOOGLE_CLIENT_SECRET`: Secret Google OAuth Anda
    - `RESEND_API_KEY`: API key Resend untuk email
    - `EMAIL_SENDER_NAME`: Nama pengirim email
    - `EMAIL_SENDER_ADDRESS`: Alamat email pengirim

## Menjalankan Aplikasi

### Menggunakan Script Helper (Recommended)

**Windows:**

```cmd
# Build images
docker.bat build

# Start semua services
docker.bat up

# Stop semua services
docker.bat down

# Lihat logs
docker.bat logs

# Lihat logs service tertentu
docker.bat logs app

# Restart services
docker.bat restart

# Reset database (hapus semua data)
docker.bat reset

# Jalankan database migrations
docker.bat migrate
```

**Linux/Mac:**

```bash
# Make script executable
chmod +x docker.sh

# Build images
./docker.sh build

# Start semua services
./docker.sh up

# Stop semua services
./docker.sh down

# Lihat logs
./docker.sh logs

# Lihat logs service tertentu
./docker.sh logs app

# Restart services
./docker.sh restart

# Reset database (hapus semua data)
./docker.sh reset

# Jalankan database migrations
./docker.sh migrate
```

### Menggunakan Docker Compose Langsung

```bash
# Build images
docker-compose build

# Start semua services
docker-compose up -d

# Stop semua services
docker-compose down

# Lihat logs
docker-compose logs -f

# Restart services
docker-compose restart
```

## Services yang Berjalan

Setelah menjalankan `docker.bat up` atau `./docker.sh up`, Anda akan memiliki:

- **Next.js App**: http://localhost:3000
- **WebSocket Server**: ws://localhost:8080
- **PostgreSQL Database**: localhost:5432
    - Database: `tellme`
    - Username: `postgres`
    - Password: `postgres`

## Database Migrations

Setelah services berjalan, jalankan migrations untuk setup database:

```bash
# Windows
docker.bat migrate

# Linux/Mac
./docker.sh migrate
```

## Troubleshooting

### 1. Port sudah digunakan

Jika port 3000, 8080, atau 5432 sudah digunakan, edit file `docker-compose.yml` dan ubah port mapping:

```yaml
ports:
    - "3001:3000" # Ganti 3000 dengan port lain
```

### 2. Database connection error

Pastikan database service sudah running dan healthy:

```bash
docker-compose ps
docker-compose logs db
```

### 3. WebSocket connection error

Pastikan WebSocket service berjalan dan port 8080 tidak terblokir:

```bash
docker-compose logs websocket
```

### 4. Environment variables tidak terbaca

Pastikan file `.env` ada di root directory dan menggunakan format yang benar.

### 5. Reset semua data

Jika ada masalah dengan database atau ingin mulai dari awal:

```bash
# Windows
docker.bat reset

# Linux/Mac
./docker.sh reset
```

## Development

Untuk development, Anda masih bisa menggunakan mode development biasa:

```bash
npm run dev
```

Docker setup ini lebih cocok untuk production deployment atau testing production build.

## Production Deployment

Untuk production deployment, pastikan:

1. Ganti `BETTER_AUTH_SECRET` dengan secret yang aman
2. Setup Google OAuth dengan domain yang benar
3. Setup Resend API key untuk email
4. Gunakan database production yang sesuai
5. Setup SSL/TLS untuk HTTPS
6. Configure firewall dan security groups

## Monitoring

Untuk monitoring logs secara real-time:

```bash
# Semua services
docker-compose logs -f

# Service tertentu
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f websocket
```

## Cleanup

Untuk menghapus semua containers dan volumes:

```bash
docker-compose down -v
docker system prune -a
```

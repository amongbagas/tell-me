# 🐳 Docker Setup untuk Tell Me Project

## ✅ Status Setup

Project Tell Me sudah berhasil dikonfigurasi untuk berjalan dengan Docker! 🎉

## Persyaratan

- Docker Desktop atau Docker Engine
- Docker Compose

## Quick Start 🚀

### 1. Setup Environment

```bash
# File .env sudah dikonfigurasi dengan kredensial yang benar
```

### 2. Jalankan Aplikasi

```bash
# Build dan start semua services
docker-compose up -d

# Lihat status
docker-compose ps

# Lihat logs
docker-compose logs -f
```

### 3. Akses Aplikasi

- 🌐 **Web App**: http://localhost:3000 (Development mode dengan Turbopack)
- 🔌 **WebSocket Server**: ws://localhost:8080
- 🗄️ **Database**: NeonDB (Cloud PostgreSQL)

## Services yang Berjalan

✅ **Next.js App** (Development Mode)

- Hot reload enabled
- Volume mounting untuk live code changes
- Next.js Turbopack untuk fast compilation
- Port: 3000

✅ **WebSocket Server**

- Real-time communication
- Port: 8080

✅ **Database**

- NeonDB (Cloud PostgreSQL)
- Connection string sudah dikonfigurasi
- Tidak perlu setup database lokal

## Script Helper

### Windows

```cmd
docker.bat up      # Start aplikasi
docker.bat down    # Stop aplikasi
docker.bat restart # Restart aplikasi
docker.bat logs    # Lihat logs
docker.bat build   # Build ulang
```

### Linux/Mac

```bash
chmod +x docker.sh  # Make executable (only once)
./docker.sh up      # Start aplikasi
./docker.sh down    # Stop aplikasi
./docker.sh restart # Restart aplikasi
./docker.sh logs    # Lihat logs
./docker.sh build   # Build ulang
```

### NPM Scripts

```bash
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run docker:restart # Restart containers
npm run docker:logs    # View logs
npm run docker:build   # Build images
```

## Development Workflow

### Live Development

Dengan volume mounting, perubahan code akan langsung terlihat:

1. Edit file di VS Code
2. Next.js akan auto-reload
3. Changes langsung terlihat di browser

### Monitoring Logs

```bash
# Semua services
docker-compose logs -f

# Service tertentu
docker-compose logs -f app
docker-compose logs -f websocket
```

## Production Mode

Untuk production, gunakan:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### 1. Port sudah digunakan

```bash
# Stop services yang menggunakan port
docker-compose down

# Edit docker-compose.yml untuk ubah port mapping
# ports:
#   - "3001:3000"  # Ganti 3000 dengan port lain
```

### 2. Container tidak start

```bash
# Lihat logs detail
docker-compose logs app
docker-compose logs websocket

# Rebuild images
docker-compose build --no-cache
```

### 3. Reset semua containers

```bash
# Stop dan hapus containers
docker-compose down

# Build dan start ulang
docker-compose up -d
```

## Konfigurasi yang Sudah Selesai

✅ **Environment Variables**

- BETTER_AUTH_SECRET: Configured
- GOOGLE_CLIENT_ID & SECRET: Ready
- RESEND_API_KEY: Set
- DATABASE_URL: NeonDB connection
- WEBSOCKET_PORT: 8080

✅ **Docker Files**

- Dockerfile (Production)
- Dockerfile.dev (Development)
- Dockerfile.websocket (WebSocket server)
- docker-compose.yml (Development)
- docker-compose.prod.yml (Production)

✅ **Helper Scripts**

- docker.sh (Linux/Mac)
- docker.bat (Windows)
- NPM scripts dalam package.json

## Cleanup

### Stop containers

```bash
docker-compose down
```

### Full cleanup

```bash
docker-compose down -v
docker system prune -a
```

## Summary

🎯 **Untuk mulai development:**

```bash
docker-compose up -d
```

🌐 **Akses aplikasi:**

- Web: http://localhost:3000
- WebSocket: ws://localhost:8080

📊 **Monitor status:**

```bash
docker-compose ps
docker-compose logs -f
```

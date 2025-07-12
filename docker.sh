#!/bin/bash

# Docker Management Script for Tell Me Project

case "$1" in
    "build")
        echo "Building Docker images..."
        docker-compose build
        ;;
    "up")
        echo "Starting all services..."
        docker-compose up -d
        echo "Services started!"
        echo "App: http://localhost:3000"
        echo "WebSocket: ws://localhost:8080"
        echo "Database: postgresql://postgres:postgres@localhost:5432/tellme"
        ;;
    "down")
        echo "Stopping all services..."
        docker-compose down
        ;;
    "restart")
        echo "Restarting all services..."
        docker-compose restart
        ;;
    "logs")
        if [ -z "$2" ]; then
            echo "Showing logs for all services..."
            docker-compose logs -f
        else
            echo "Showing logs for $2..."
            docker-compose logs -f "$2"
        fi
        ;;
    "shell")
        service=${2:-app}
        echo "Opening shell in $service..."
        docker-compose exec "$service" sh
        ;;
    "reset")
        echo "Resetting all data (this will remove all volumes)..."
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker-compose up -d
        fi
        ;;
    "migrate")
        echo "Running database migrations..."
        docker-compose exec app npx drizzle-kit push
        ;;
    *)
        echo "Usage: $0 {build|up|down|restart|logs|shell|reset|migrate}"
        echo ""
        echo "Commands:"
        echo "  build    - Build Docker images"
        echo "  up       - Start all services"
        echo "  down     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show logs (optionally specify service: app, db, websocket)"
        echo "  shell    - Open shell in container (default: app)"
        echo "  reset    - Reset all data and restart"
        echo "  migrate  - Run database migrations"
        echo ""
        echo "Examples:"
        echo "  $0 build"
        echo "  $0 up"
        echo "  $0 logs app"
        echo "  $0 shell db"
        exit 1
        ;;
esac

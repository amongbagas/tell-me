@echo off
REM Docker Management Script for Tell Me Project (Windows)

if "%1"=="build" (
    echo Building Docker images...
    docker-compose build
    goto :end
)

if "%1"=="up" (
    echo Starting all services...
    docker-compose up -d
    echo Services started!
    echo App: http://localhost:3000
    echo WebSocket: ws://localhost:8080
    echo Database: postgresql://postgres:postgres@localhost:5432/tellme
    goto :end
)

if "%1"=="down" (
    echo Stopping all services...
    docker-compose down
    goto :end
)

if "%1"=="restart" (
    echo Restarting all services...
    docker-compose restart
    goto :end
)

if "%1"=="logs" (
    if "%2"=="" (
        echo Showing logs for all services...
        docker-compose logs -f
    ) else (
        echo Showing logs for %2...
        docker-compose logs -f %2
    )
    goto :end
)

if "%1"=="shell" (
    if "%2"=="" (
        set service=app
    ) else (
        set service=%2
    )
    echo Opening shell in %service%...
    docker-compose exec %service% sh
    goto :end
)

if "%1"=="reset" (
    echo Resetting all data (this will remove all volumes)...
    set /p confirm=Are you sure? (y/N): 
    if /i "%confirm%"=="y" (
        docker-compose down -v
        docker-compose up -d
    )
    goto :end
)

if "%1"=="migrate" (
    echo Running database migrations...
    docker-compose exec app npx drizzle-kit push
    goto :end
)

REM Default help
echo Usage: %0 {build^|up^|down^|restart^|logs^|shell^|reset^|migrate}
echo.
echo Commands:
echo   build    - Build Docker images
echo   up       - Start all services
echo   down     - Stop all services
echo   restart  - Restart all services
echo   logs     - Show logs (optionally specify service: app, db, websocket)
echo   shell    - Open shell in container (default: app)
echo   reset    - Reset all data and restart
echo   migrate  - Run database migrations
echo.
echo Examples:
echo   %0 build
echo   %0 up
echo   %0 logs app
echo   %0 shell db

:end

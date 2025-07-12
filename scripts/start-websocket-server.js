#!/usr/bin/env node

/**
 * WebSocket Server Starter
 * This script starts the WebSocket server for voice calls
 */

const { spawn } = require('child_process');
const path = require('path');

// Get the project root directory
const projectRoot = path.join(__dirname, '..');

try {
    console.log('Starting WebSocket server for voice calls...');

    // Start the WebSocket server using tsx
    const serverProcess = spawn('npx', ['tsx', 'lib/websocket-server.ts'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true
    });

    serverProcess.on('error', (error) => {
        console.error('Failed to start WebSocket server:', error);
        process.exit(1);
    });

    serverProcess.on('exit', (code) => {
        console.log(`WebSocket server exited with code ${code}`);
        process.exit(code);
    });

    console.log('WebSocket server is running on ws://localhost:8080/voice-call');
    console.log('Press Ctrl+C to stop the server');

} catch (error) {
    console.error('Failed to start WebSocket server:', error);
    process.exit(1);
}

process.on('SIGINT', () => {
    console.log('\nShutting down WebSocket server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down WebSocket server...');
    process.exit(0);
});

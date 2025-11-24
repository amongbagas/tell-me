# TellMe API Documentation

This document provides details about the API endpoints available in the TellMe application.

## Base URL
All API endpoints are prefixed with `/api`.

## Authentication
Authentication is handled via [Better Auth](https://better-auth.com/).
- **Endpoint**: `/api/auth/[...all]`
- **Description**: Handles all authentication-related operations (signin, signout, session, etc.) compatible with Better Auth client.

---

## WebSocket Management

### Get WebSocket Server Status
Checks the health and stats of the external WebSocket server.

- **URL**: `/api/websocket`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "stats": { ... },
    "serverUrl": "ws://localhost:8080"
  }
  ```

### Control WebSocket Server
Currently supports checking/ensuring the server is running.

- **URL**: `/api/websocket`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "action": "start"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "WebSocket server is running",
    "serverUrl": "ws://localhost:8080",
    "serverStats": { ... }
  }
  ```

---

## Room Management

### Check Room Existence
Checks if a specific room exists.

- **URL**: `/api/rooms`
- **Method**: `GET`
- **Query Parameters**:
  - `roomId`: The ID of the room to check.
- **Response**:
  ```json
  {
    "success": true,
    "exists": true
  }
  ```

### Create Room
Creates a new room. Only users with the "listener" role can create rooms.

- **URL**: `/api/rooms`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "roomId": "string",
    "role": "listener",
    "createdBy": "string (optional)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "created": true,
    "roomId": "string"
  }
  ```

### Update Room Status
Updates the status of a room (e.g., waiting, active, closed).

- **URL**: `/api/rooms`
- **Method**: `PATCH`
- **Body**:
  ```json
  {
    "roomId": "string",
    "status": "waiting" | "active" | "closed"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Room status updated successfully"
  }
  ```

### Delete Room
Deletes a room and all its participants.

- **URL**: `/api/rooms`
- **Method**: `DELETE`
- **Query Parameters**:
  - `roomId`: The ID of the room to delete.
- **Response**:
  ```json
  {
    "success": true,
    "message": "Room deleted successfully"
  }
  ```

---

## Room Discovery

### Find Room or Get Room Details
This endpoint serves two purposes based on the presence of `roomId`.

#### 1. Get Room Details (Participant Mode)
Gets details of a specific room and its participants.

- **URL**: `/api/rooms/find`
- **Method**: `GET`
- **Query Parameters**:
  - `roomId`: The ID of the room.
- **Response**:
  ```json
  {
    "success": true,
    "roomId": "string",
    "participants": [
      { "uid": number, "isMuted": boolean, "role": "string" }
    ]
  }
  ```

#### 2. Find Available Room (Speaker Mode)
Finds the oldest available room with "waiting" status.

- **URL**: `/api/rooms/find`
- **Method**: `GET`
- **Query Parameters**: None
- **Response**:
  ```json
  {
    "success": true,
    "roomId": "string"
  }
  ```

---

## Participant Management

### Join Room
Adds a participant to a room.

- **URL**: `/api/rooms/participant`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "roomId": "string",
    "uid": number,
    "role": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### Mute/Unmute Participant
Updates the mute status of a participant.

- **URL**: `/api/rooms/participant`
- **Method**: `PATCH`
- **Body**:
  ```json
  {
    "roomId": "string",
    "uid": number,
    "isMuted": boolean
  }
  ```
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### Leave Room
Removes a participant from a room.

- **URL**: `/api/rooms/participant`
- **Method**: `DELETE`
- **Query Parameters**:
  - `roomId`: The ID of the room.
  - `uid`: The UID of the participant.
- **Response**:
  ```json
  {
    "success": true
  }
  ```

---

## Participant Heartbeat

### Update Heartbeat
Updates the `lastActive` timestamp for a participant to keep them alive in the room.

- **URL**: `/api/rooms/participant/heartbeat`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "roomId": "string",
    "uid": number
  }
  ```
- **Response**:
  ```json
  {
    "success": true
  }
  ```

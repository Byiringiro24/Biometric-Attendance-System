# Server Backend - FK623 Attendance System

## Overview

This is the central backend server for the FK623 biometric attendance management system running on **Linux**. It communicates with tablet devices via HTTP to bridge commands to the FK623 devices.

## Architecture

```
Linux Server Backend (Port 5001)
    ↓
    HTTP REST API
    ↓
Tablet Backend (Windows, Port 5000)
    ↓
    stdin/stdout communication
    ↓
FKBridge.exe (C#)
    ↓
    DLL function calls
    ↓
FK623 Biometric Device
```

## Installation

### Prerequisites
- Node.js 18+
- Linux, macOS, or WSL
- SQLite3

### Setup Steps

```bash
# 1. Navigate to server backend
cd server/backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Configure environment (if needed)
# Edit .env and set PORT, DB_PATH, etc.

# 5. Start server
npm start

# Or for development with auto-reload:
npm run dev
```

## API Endpoints

### Students Management
- `GET /api/students` - List all students
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Device Control (via Tablet Bridge)
- `POST /api/device/pull-logs` - Pull attendance logs from device
- `GET /api/device/status` - Get device status
- `POST /api/device/connect` - Connect to biometric device
- `POST /api/device/disconnect` - Disconnect from device

### Attendance Records
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics
- `GET /api/attendance/daily-stats` - Get today's statistics

### Tablet Management
- `GET /api/tablets` - List registered tablets
- `POST /api/tablets` - Register new tablet
- `PUT /api/tablets/:id/status` - Update tablet status
- `GET /api/tablets/:id/health` - Check tablet health

## Request Examples

### Register a Tablet

```bash
curl -X POST http://localhost:5001/api/tablets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tablet-001",
    "ip": "192.168.1.100",
    "port": 5000
  }'
```

### Create a Student

```bash
curl -X POST http://localhost:5001/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "id": "STU-001",
    "name": "John Doe",
    "class": "9A",
    "pushToDevice": true
  }'
```

### Pull Logs from Device

```bash
curl -X POST http://localhost:5001/api/device/pull-logs \
  -H "Content-Type: application/json" \
  -d '{
    "tabletId": "tablet-id-here",
    "readMark": 0
  }'
```

### Get Attendance Statistics

```bash
curl http://localhost:5001/api/attendance/stats \
  -H "Content-Type: application/json"
```

## Database Schema

### students
```sql
id (TEXT PRIMARY KEY)
name (TEXT)
class (TEXT)
status (TEXT) - 'active', 'inactive', 'deleted'
pushToDevice (INTEGER) - 1 or 0
created_at (DATETIME)
updated_at (DATETIME)
```

### attendance
```sql
id (TEXT PRIMARY KEY)
studentId (TEXT FOREIGN KEY)
studentName (TEXT)
timestamp (DATETIME)
method (INTEGER) - 1=Fingerprint, 2=Password, 3=Card, 20=Face
direction (INTEGER) - 1,3,5,7=IN, 2,4,6,8=OUT
tabletId (TEXT FOREIGN KEY)
created_at (DATETIME)
```

### tablets
```sql
id (TEXT PRIMARY KEY)
name (TEXT)
ip (TEXT)
port (INTEGER)
url (TEXT UNIQUE)
status (TEXT) - 'online', 'offline', 'error'
lastSync (DATETIME)
created_at (DATETIME)
updated_at (DATETIME)
```

### devices
```sql
id (TEXT PRIMARY KEY)
tabletId (TEXT FOREIGN KEY)
ip (TEXT)
port (INTEGER)
license (TEXT)
connected (INTEGER) - 1 or 0
lastStatus (DATETIME)
created_at (DATETIME)
```

## Communication Flow

### When Admin Adds Student
1. Admin adds student on Server Dashboard
2. Server saves to central database
3. Server loops through all online tablets
4. Server makes HTTP call to each tablet: `POST /api/device/users`
5. Tablet forwards command to FKBridge via stdin
6. FKBridge calls FK_SetUserName_StringID() on device
7. Student added to device

### When Admin Pulls Logs
1. Admin clicks "Pull Logs"
2. Server makes HTTP call to tablet: `POST /api/device/pull-logs`
3. Tablet commands FKBridge: "GET_LOGS|0"
4. FKBridge calls FK_LoadGeneralLogData() and reads logs
5. FKBridge returns JSON array to tablet
6. Tablet returns to server
7. Server stores in attendance table
8. Dashboard updates

## Environment Variables

```
PORT=5001                           # Server port
NODE_ENV=development                # Environment
DB_PATH=./database/server.db        # SQLite database path
TABLET_API_TIMEOUT=30000            # Tablet API timeout (ms)
SERVER_URL=http://localhost:5001    # Server URL for callbacks
```

## Troubleshooting

### Tablet not connecting
- Check tablet IP and port
- Verify tablet backend is running on port 5000
- Run health check: `GET /api/tablets/:id/health`

### Database errors
- Check DB_PATH exists and is writable
- Run: `npm start` will auto-create database

### Logs not pulling
- Verify device is connected on tablet
- Check FKBridge is running on tablet
- Try pulling from tablet frontend first

## Development

```bash
# Start with auto-reload
npm run dev

# Check syntax
npm run lint

# Production build (if needed)
npm run build
```

## Port Configuration

- **Server Backend**: 5001 (Primary API)
- **Server Frontend**: 3001 (Admin Dashboard)
- **Tablet Backend**: 5000 (Device communication)
- **Tablet Frontend**: 3000 (Tablet interface)

All components communicate via HTTP REST APIs.

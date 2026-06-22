# Server Frontend - FK623 Attendance Dashboard

## Overview

This is the admin dashboard for the FK623 biometric attendance management system. It provides a user-friendly web interface for:
- Viewing system statistics
- Managing students
- Viewing attendance records
- Monitoring device status
- Registering tablets

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Running Server Backend on http://localhost:5001

### Setup Steps

```bash
# 1. Navigate to server frontend
cd server/frontend

# 2. Install dependencies
npm install

# 3. Create environment file (optional)
echo "NEXT_PUBLIC_API_URL=http://localhost:5001/api" > .env.local

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3001
```

## Production Build

```bash
# Build
npm run build

# Start production server
npm start
```

## Project Structure

```
server/frontend/
├── app/
│   ├── page.tsx              # Main dashboard page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── components/
│       ├── Dashboard.tsx     # Dashboard statistics
│       ├── Header.tsx        # Top navigation
│       ├── Sidebar.tsx       # Side navigation
│       └── ...
├── lib/
│   └── api.ts                # API client functions
├── package.json
├── tailwind.config.js        # Tailwind CSS config
├── next.config.mjs           # Next.js config
└── tsconfig.json            # TypeScript config
```

## Features

### Dashboard
- **Key Statistics**: Total students, today's records, check-ins, check-outs
- **Authentication Methods**: Fingerprint, face, card, password counts
- **Connected Tablets**: List of registered tablets with status
- **System Status**: Overall system health and metrics

### Students Management (Coming Soon)
- Add new students
- Edit student information
- Delete students
- Bulk import/export
- Search and filter

### Attendance Records (Coming Soon)
- View attendance logs
- Filter by date range
- Filter by student
- Export reports
- Charts and analytics

### Device Status (Coming Soon)
- Device connection status
- Real-time statistics
- Manual log pulling
- Device configuration

## API Integration

The frontend communicates with the Server Backend via REST API.

### API Base URL
```
Default: http://localhost:5001/api
Can be configured via NEXT_PUBLIC_API_URL environment variable
```

### Available API Calls

See `lib/api.ts` for all available functions:
- `getStudents(classFilter)`
- `createStudent(studentData)`
- `getAttendanceStats(startDate, endDate)`
- `getDailyStats(date)`
- `getAllTablets()`
- `getDeviceStatus(tabletId)`
- `pullLogs(tabletId, readMark)`
- `registerTablet(name, ip, port)`

## Styling

Uses **Tailwind CSS** for styling. Configuration in `tailwind.config.js`.

### Colors Used
- Indigo: Primary actions and sidebar
- Blue: Students statistics
- Green: Attendance records
- Purple: Check-in events
- Orange: Check-out events

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:5001/api  # Server Backend URL
```

## Development

```bash
# Start with hot reload
npm run dev

# Format code
npm run lint

# Production build
npm run build
npm start
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Linux Server
```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "server-dashboard" -- start
pm2 save
pm2 startup
```

## Troubleshooting

### API connection errors
- Check Server Backend is running on port 5001
- Verify NEXT_PUBLIC_API_URL environment variable
- Check browser console for errors

### Dashboard shows no data
- Verify no attendance records in database
- Check tablet registration
- Pull logs from device

### Styling issues
- Run: `npm run build`
- Clear browser cache
- Check Tailwind config

## Features Roadmap

- [ ] Student management UI
- [ ] Attendance filtering and export
- [ ] Charts and analytics
- [ ] Device configuration UI
- [ ] User authentication
- [ ] Multi-language support
- [ ] Mobile responsive improvements

## Support

For issues or questions, check the main README.md in the project root.

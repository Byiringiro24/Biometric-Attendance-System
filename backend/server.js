import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ============ DATABASE ============
const dbPath = join(__dirname, 'database', 'server.db');
const dbDir = join(__dirname, 'database');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err);
  else {
    console.log('✅ Connected to server database');
    initTables();
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function initTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentId TEXT UNIQUE,
      deviceUserId TEXT UNIQUE,
      name TEXT,
      className TEXT,
      section TEXT,
      club TEXT,
      parentPhone TEXT,
      status TEXT DEFAULT 'active',
      biometricMethods TEXT,
      backupNumbers TEXT,
      privilege INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      studentId TEXT,
      deviceUserId TEXT,
      studentName TEXT,
      className TEXT,
      section TEXT,
      club TEXT,
      deviceId TEXT,
      authenticationMethod TEXT,
      direction TEXT,
      timestamp TEXT,
      status TEXT,
      verified INTEGER DEFAULT 1,
      tabletId TEXT,
      createdAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS tablets (
      id TEXT PRIMARY KEY,
      name TEXT,
      ip TEXT,
      port INTEGER,
      url TEXT,
      status TEXT DEFAULT 'offline',
      lastSync TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      className TEXT,
      subject TEXT,
      startTime TEXT,
      endTime TEXT,
      status TEXT DEFAULT 'scheduled',
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      tabletId TEXT,
      ip TEXT,
      port INTEGER,
      license TEXT,
      connected INTEGER DEFAULT 0,
      lastStatus TEXT,
      created_at TEXT,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(studentId)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(className)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_time ON sessions(startTime)`
  ];
  db.serialize(() => {
    queries.forEach(q => db.run(q, (err) => { if (err) console.error('Table error:', err); }));
    // Add club column if not exists (for existing databases)
    db.run("ALTER TABLE students ADD COLUMN club TEXT", (err) => {
      if (err && !err.message.includes('duplicate column')) console.log('club column already exists or added');
    });
    db.run("ALTER TABLE attendance ADD COLUMN club TEXT", (err) => {
      if (err && !err.message.includes('duplicate column')) console.log('club column already exists or added');
    });
  });
}

// ============ TABLET PROXY ============
const TABLET_URL = process.env.TABLET_URL || 'http://localhost:5000';

async function callTablet(tabletId, endpoint, method = 'GET', data = null) {
  try {
    const tablet = await get('SELECT * FROM tablets WHERE id = ?', [tabletId]);
    if (!tablet) throw new Error('Tablet not found');
    const url = tablet.url + '/api' + endpoint;
    
    const fetch = (await import('node-fetch')).default;
    const options = {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'X-Tablet-Id': tabletId 
      },
      timeout: 30000
    };
    
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(url, options);
    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(error.message || 'Tablet communication failed');
  }
}

// ============ API ROUTES ============

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Server Backend', port: PORT, tabletUrl: TABLET_URL });
});

// Tablets
app.get('/api/tablets', async (req, res) => {
  try {
    const tablets = await all('SELECT * FROM tablets ORDER BY createdAt DESC');
    res.json({ success: true, tablets });
  } catch (error) {
    res.json({ success: false, error: error.message, tablets: [] });
  }
});

app.post('/api/tablets', async (req, res) => {
  try {
    const { name, ip, port = 5000 } = req.body;
    const id = `TABLET-${Date.now().toString().slice(-6)}`;
    const url = `http://${ip}:${port}`;
    const now = new Date().toISOString();
    
    await run(
      'INSERT OR REPLACE INTO tablets (id, name, ip, port, url, status, lastSync, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name || 'Tablet', ip, port, url, 'online', now, now, now]
    );
    
    const tablet = await get('SELECT * FROM tablets WHERE id = ?', [id]);
    res.json({ success: true, tablet });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Device Proxy Routes
app.post('/api/device/connect', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001', ...data } = req.body;
    const result = await callTablet(tabletId, '/device/connect', 'POST', data);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/device/disconnect', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001' } = req.body;
    const result = await callTablet(tabletId, '/device/disconnect', 'POST');
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/device/status', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001' } = req.query;
    const result = await callTablet(tabletId, '/device/status', 'GET');
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message, connected: false });
  }
});

app.post('/api/device/sync-time', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001' } = req.body;
    const result = await callTablet(tabletId, '/device/sync-time', 'POST');
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ====== PULL LOGS – Enhanced with better saving ======
app.post('/api/device/pull-logs', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001', readMark = 0 } = req.body;
    const result = await callTablet(tabletId, '/device/pull-logs', 'POST', { readMark });
    
    let savedCount = 0;
    const errors = [];
    
    if (result.success && result.data?.logs) {
      for (const log of result.data.logs) {
        try {
          // Normalize field names from tablet - handle both log.userId and log.deviceUserId
          const deviceUserId = log.userId || log.deviceUserId;
          const logTimestamp = log.timestamp;
          
          // Validate required fields
          if (!deviceUserId || !logTimestamp) {
            errors.push(`Invalid log: missing deviceUserId or timestamp`);
            continue;
          }
          
          // Check for duplicates using composite key (deviceUserId + timestamp)
          const existing = await get(
            'SELECT id FROM attendance WHERE deviceUserId = ? AND timestamp = ?', 
            [deviceUserId, logTimestamp]
          );
          
          if (existing) {
            console.log(`Skipping duplicate log for user ${deviceUserId} at ${logTimestamp}`);
            continue;
          }
          
          // Fetch student details for enrichment
          const student = await get('SELECT * FROM students WHERE deviceUserId = ?', [deviceUserId]);
          
          // Insert with all fields properly mapped
          await run(
            `INSERT INTO attendance 
            (id, studentId, deviceUserId, studentName, className, section, club, deviceId, authenticationMethod, direction, timestamp, status, verified, tabletId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              log.id || 'ATT-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
              student?.studentId || log.studentId || 'RW-' + deviceUserId,
              deviceUserId,
              student?.name || log.studentName || log.userName || deviceUserId,
              student?.className || log.className || '',
              student?.section || log.section || '',
              student?.club || log.club || '',
              log.deviceId || 'FK_DEVICE',
              log.authenticationMethod || log.method || 'FINGERPRINT',
              log.direction || 'IN',
              logTimestamp,
              log.status || 'Present',
              1,
              tabletId,
              new Date().toISOString()
            ]
          );
          savedCount++;
        } catch (e) { 
          errors.push(`Error saving log: ${e.message}`);
          console.error('Error saving log:', e);
        }
      }
    }
    
    // Return consistent response format with error tracking
    res.json({ 
      success: result.success,
      data: { 
        savedCount,
        totalLogs: result.data?.logs?.length || 0,
        errors: errors.length > 0 ? errors : undefined
      },
      error: result.error
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ====== PULL USERS – Enhanced with better saving ======
app.get('/api/device/users', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001' } = req.query;
    const result = await callTablet(tabletId, '/device/users', 'GET');
    
    let savedCount = 0;
    if (result.success && result.data?.users) {
      for (const user of result.data.users) {
        try {
          const userId = user.userId || user.id;
          if (!userId) continue;
          
          const existing = await get('SELECT * FROM students WHERE deviceUserId = ?', [userId]);
          if (existing) {
            // Update existing record with latest info
            await run(
              `UPDATE students SET 
                name = ?,
                biometricMethods = ?,
                backupNumbers = ?,
                privilege = ?,
                enabled = ?,
                updatedAt = ?
              WHERE deviceUserId = ?`,
              [
                user.name || existing.name,
                (user.biometricMethods || []).join(','),
                (user.backupNumbers || []).join(','),
                user.privilege || 0,
                user.enabled !== false ? 1 : 0,
                new Date().toISOString(),
                userId
              ]
            );
          } else {
            await run(
              `INSERT INTO students 
              (id, studentId, deviceUserId, name, className, section, club, status, biometricMethods, backupNumbers, privilege, enabled, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'STU-' + Date.now() + '-' + userId,
                'RW-' + userId,
                userId,
                user.name || userId,
                '',
                '',
                '',
                user.enabled !== false ? 'active' : 'inactive',
                (user.biometricMethods || []).join(','),
                (user.backupNumbers || []).join(','),
                user.privilege || 0,
                user.enabled !== false ? 1 : 0,
                new Date().toISOString(),
                new Date().toISOString()
              ]
            );
          }
          savedCount++;
        } catch (e) { 
          console.error('Error saving user:', e.message);
        }
      }
    }
    res.json({ 
      ...result, 
      data: { 
        ...result.data, 
        savedCount 
      } 
    });
  } catch (error) {
    res.json({ success: false, error: error.message, data: { users: [], count: 0, savedCount: 0 } });
  }
});

app.post('/api/device/users', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001', userId, name } = req.body;
    const result = await callTablet(tabletId, '/device/users', 'POST', { userId, name });
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/device/users/:id', async (req, res) => {
  try {
    const { tabletId = 'TABLET-001' } = req.query;
    const result = await callTablet(tabletId, '/device/users/' + req.params.id, 'DELETE');
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Students
app.get('/api/students', async (req, res) => {
  try {
    const students = await all('SELECT * FROM students ORDER BY name');
    const parsed = students.map(s => ({
      ...s,
      biometricMethods: s.biometricMethods ? s.biometricMethods.split(',') : [],
      backupNumbers: s.backupNumbers ? s.backupNumbers.split(',').map(Number) : []
    }));
    res.json({ success: true, students: parsed, count: parsed.length });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const student = req.body;
    const now = new Date().toISOString();
    
    await run(
      `INSERT OR REPLACE INTO students 
      (id, studentId, deviceUserId, name, className, section, club, parentPhone, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.id || 'STU-' + Date.now(),
        student.studentId || 'RW-' + (student.deviceUserId || Date.now()),
        student.deviceUserId || student.studentId,
        student.name,
        student.className || '',
        student.section || '',
        student.club || '',
        student.parentPhone || '',
        student.status || 'active',
        now,
        now
      ]
    );
    
    if (student.pushToDevice && student.deviceUserId) {
      try {
        await callTablet('TABLET-001', '/device/users', 'POST', { 
          userId: student.deviceUserId, 
          name: student.name 
        });
      } catch (e) { console.error('Error pushing to tablet:', e); }
    }
    
    res.json({ success: true, student });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await run('DELETE FROM students WHERE id = ? OR studentId = ? OR deviceUserId = ?', 
      [req.params.id, req.params.id, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Attendance with date range filter
app.get('/api/attendance', async (req, res) => {
  try {
    const { startDate, endDate, studentId, className, club } = req.query;
    let sql = `SELECT * FROM attendance WHERE 1=1`;
    const params = [];
    if (startDate) { sql += ' AND timestamp >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND timestamp <= ?'; params.push(endDate); }
    if (studentId) { sql += ' AND studentId = ?'; params.push(studentId); }
    if (className) { sql += ' AND className = ?'; params.push(className); }
    if (club) { sql += ' AND club = ?'; params.push(club); }
    sql += ' ORDER BY timestamp DESC LIMIT 5000';
    const attendance = await all(sql, params);
    res.json({ success: true, attendance, count: attendance.length });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalStudents = await get('SELECT COUNT(*) as count FROM students WHERE status = "active"');
    const todayAttendance = await get('SELECT COUNT(DISTINCT studentId) as count FROM attendance WHERE date(timestamp) = ?', [today]);
    const totalLogs = await get('SELECT COUNT(*) as count FROM attendance');
    const tabletsList = await all('SELECT * FROM tablets');
    
    const methodStats = await all('SELECT authenticationMethod, COUNT(*) as count FROM attendance GROUP BY authenticationMethod');
    const directionStats = await all('SELECT direction, COUNT(*) as count FROM attendance GROUP BY direction');
    
    let deviceConnected = false;
    let deviceInfo = { users: 0, faces: 0, fingerprints: 0 };
    try {
      const statusResult = await callTablet('TABLET-001', '/device/status', 'GET');
      if (statusResult.success && statusResult.data) {
        deviceConnected = true;
        deviceInfo.users = statusResult.data.users || 0;
        deviceInfo.faces = statusResult.data.faces || 0;
        deviceInfo.fingerprints = statusResult.data.fingerprints || 0;
      }
    } catch (e) { /* Device not connected */ }
    
    res.json({
      success: true,
      stats: {
        totalStudents: totalStudents?.count || 0,
        attendanceToday: todayAttendance?.count || 0,
        totalLogs: totalLogs?.count || 0,
        totalDevices: tabletsList.length || 0,
        onlineDevices: tabletsList.filter(t => t.status === 'online').length || 0,
        deviceConnected,
        deviceUsers: deviceInfo.users || 0,
        deviceFaces: deviceInfo.faces || 0,
        deviceFingerprints: deviceInfo.fingerprints || 0,
        lastUpdated: new Date().toISOString(),
        fingerprintCount: methodStats.find(m => m.authenticationMethod === 'Fingerprint')?.count || 0,
        faceCount: methodStats.find(m => m.authenticationMethod === 'Face Recognition')?.count || 0,
        cardCount: methodStats.find(m => m.authenticationMethod === 'RFID Card')?.count || 0,
        passwordCount: methodStats.find(m => m.authenticationMethod === 'Password/PIN')?.count || 0,
        checkInCount: directionStats.find(d => d.direction === 'IN')?.count || 0,
        checkOutCount: directionStats.find(d => d.direction === 'OUT')?.count || 0,
      },
      charts: { methodStats, directionStats }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/recent', async (req, res) => {
  try {
    const recent = await all('SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 20');
    res.json({ success: true, recent });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============ SESSIONS MANAGEMENT ============

// Create session
app.post('/api/sessions', async (req, res) => {
  try {
    const { name, className, subject, startTime, endTime, createdBy } = req.body;
    if (!name || !className || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const id = 'SES-' + Date.now();
    await run(
      `INSERT INTO sessions (id, name, className, subject, startTime, endTime, status, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, className, subject, startTime, endTime, 'scheduled', createdBy || 'admin', new Date().toISOString(), new Date().toISOString()]
    );
    const session = await get('SELECT * FROM sessions WHERE id = ?', [id]);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions with filters
app.get('/api/sessions', async (req, res) => {
  try {
    const { className, status, search } = req.query;
    let query = 'SELECT * FROM sessions WHERE 1=1';
    const params = [];
    
    if (className) {
      query += ' AND className = ?';
      params.push(className);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR subject LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY startTime DESC';
    const sessions = await all(query, params);
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update session status
app.patch('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, endTime } = req.body;
    
    if (status === 'ended' && !endTime) {
      await run('UPDATE sessions SET status = ?, endTime = ?, updatedAt = ? WHERE id = ?',
        [status, new Date().toISOString(), new Date().toISOString(), id]);
    } else if (status) {
      await run('UPDATE sessions SET status = ?, updatedAt = ? WHERE id = ?',
        [status, new Date().toISOString(), id]);
    }
    
    const session = await get('SELECT * FROM sessions WHERE id = ?', [id]);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ENHANCED STUDENTS ENDPOINT ============

app.get('/api/students/search', async (req, res) => {
  try {
    const { q, className, section, club, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM students WHERE status = "active"';
    const params = [];
    
    if (q) {
      query += ' AND (studentId LIKE ? OR deviceUserId LIKE ? OR name LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (className) {
      query += ' AND className = ?';
      params.push(className);
    }
    if (section) {
      query += ' AND section = ?';
      params.push(section);
    }
    if (club) {
      query += ' AND club = ?';
      params.push(club);
    }
    
    query += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const students = await all(query, params);
    const countResult = await get('SELECT COUNT(*) as total FROM students WHERE status = "active"');
    
    res.json({ 
      success: true, 
      data: { 
        students, 
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ LIVE MONITORING ============

app.get('/api/monitor/live', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    // Get recent attendance with all student details
    const records = await all(
      `SELECT a.*, s.club 
       FROM attendance a
       LEFT JOIN students s ON a.studentId = s.studentId OR a.deviceUserId = s.deviceUserId
       ORDER BY a.timestamp DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );
    
    res.json({ 
      success: true, 
      data: records.map(r => ({
        ...r,
        timestamp: new Date(r.timestamp),
        timeAgo: getTimeAgo(new Date(r.timestamp))
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get today's attendance summary
app.get('/api/attendance/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await all(
      `SELECT a.*, s.club 
       FROM attendance a
       LEFT JOIN students s ON a.studentId = s.studentId OR a.deviceUserId = s.deviceUserId
       WHERE DATE(a.timestamp) = ?
       ORDER BY a.timestamp DESC`,
      [today]
    );
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get attendance statistics for a specific session
app.get('/api/attendance/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    
    const records = await all(
      `SELECT a.* FROM attendance a
       WHERE a.className = ? AND DATE(a.timestamp) = DATE(?)
       ORDER BY a.timestamp DESC`,
      [session.className, session.startTime]
    );
    
    const uniqueStudents = new Set(records.map(r => r.studentId));
    res.json({ 
      success: true, 
      data: {
        session,
        totalPresent: uniqueStudents.size,
        records
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function
function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

// ================== CHANGED LINE ==================
// Bind to all network interfaces (0.0.0.0) and use PORT from .env
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  FK Biometric Attendance System - Server Backend (FIXED)     ║');
  console.log('║  Running on: http://localhost:' + PORT + '                         ║');
  console.log('║  Tablet URL: ' + TABLET_URL + '                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database closed');
    process.exit(0);
  });
});
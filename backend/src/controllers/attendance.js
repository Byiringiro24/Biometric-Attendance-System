import { allAsync, getAsync } from '../models/database.js';

function methodLabel(method) {
  const value = Number(method);
  if (value === 1) return 'Fingerprint';
  if (value === 2) return 'Password/PIN';
  if (value === 3) return 'RFID Card';
  if (value === 20) return 'Face Recognition';
  return method ? `Method ${method}` : 'Device Verified';
}

function directionLabel(direction) {
  const value = Number(direction);
  if ([1, 3, 5, 7].includes(value)) return 'In';
  if ([2, 4, 6, 8].includes(value)) return 'Out';
  return '';
}

function normalizeAttendance(record) {
  return {
    ...record,
    name: record.studentName,
    authenticationMethod: methodLabel(record.method),
    status: record.status || 'Present',
    directionLabel: directionLabel(record.direction),
  };
}

export async function getAttendance(req, res) {
  try {
    const {
      studentId,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = req.query;

    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];

    if (studentId) {
      query += ' AND studentId = ?';
      params.push(studentId);
    }

    if (startDate) {
      query += ' AND datetime(timestamp) >= datetime(?)';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND datetime(timestamp) <= datetime(?)';
      params.push(endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const records = await allAsync(query, params);
    res.json(records.map(normalizeAttendance));
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getTodayAttendance(req, res) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const records = await allAsync(
      'SELECT * FROM attendance WHERE DATE(timestamp) = ? ORDER BY timestamp DESC',
      [date]
    );
    res.json(records.map(normalizeAttendance));
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getAttendanceStats(req, res) {
  try {
    const { startDate, endDate, tabletId } = req.query;

    let query = `
      SELECT
        COUNT(*) as totalRecords,
        COUNT(DISTINCT studentId) as uniqueStudents,
        COUNT(CASE WHEN method = 1 THEN 1 END) as fingerprintCount,
        COUNT(CASE WHEN method = 20 THEN 1 END) as faceCount,
        COUNT(CASE WHEN method = 3 THEN 1 END) as cardCount,
        COUNT(CASE WHEN method = 2 THEN 1 END) as passwordCount,
        COUNT(CASE WHEN direction IN (1, 3, 5, 7) THEN 1 END) as checkInCount,
        COUNT(CASE WHEN direction IN (2, 4, 6, 8) THEN 1 END) as checkOutCount
      FROM attendance
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND datetime(timestamp) >= datetime(?)';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND datetime(timestamp) <= datetime(?)';
      params.push(endDate);
    }

    if (tabletId) {
      query += ' AND tabletId = ?';
      params.push(tabletId);
    }

    const stats = await getAsync(query, params);
    res.json(stats || {
      totalRecords: 0,
      uniqueStudents: 0,
      fingerprintCount: 0,
      faceCount: 0,
      cardCount: 0,
      passwordCount: 0,
      checkInCount: 0,
      checkOutCount: 0,
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getDailyStats(req, res) {
  try {
    const { date, tabletId } = req.query;

    let query = `
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT studentId) as students,
        MAX(timestamp) as lastRecord
      FROM attendance
      WHERE DATE(timestamp) = ?
    `;
    const params = [date || new Date().toISOString().split('T')[0]];

    if (tabletId) {
      query += ' AND tabletId = ?';
      params.push(tabletId);
    }

    const stats = await getAsync(query, params);
    res.json(stats || { total: 0, students: 0, lastRecord: null });
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({ error: error.message });
  }
}

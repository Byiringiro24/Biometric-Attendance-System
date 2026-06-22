import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/server.db');

let db;

export function initializeDatabase() {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Database connection error:', err);
      process.exit(1);
    }
    console.log('✓ Connected to Server Database');
    createTables();
  });
}

function createTables() {
  db.serialize(() => {
    // Students table
    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        class TEXT,
        status TEXT DEFAULT 'active',
        pushToDevice INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance table
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL,
        studentName TEXT,
        timestamp DATETIME NOT NULL,
        method INTEGER,
        direction INTEGER,
        tabletId TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id)
      )
    `);

    // Tablets table (registered tablets)
    db.run(`
      CREATE TABLE IF NOT EXISTS tablets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ip TEXT NOT NULL,
        port INTEGER DEFAULT 5000,
        url TEXT UNIQUE,
        status TEXT DEFAULT 'offline',
        lastSync DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Device configuration (per tablet)
    db.run(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        tabletId TEXT NOT NULL,
        ip TEXT,
        port INTEGER,
        license TEXT,
        connected INTEGER DEFAULT 0,
        lastStatus DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tabletId) REFERENCES tablets(id)
      )
    `);

    console.log('✓ Database tables initialized');
  });
}

export function getDatabase() {
  return db;
}

export function runAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function getAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

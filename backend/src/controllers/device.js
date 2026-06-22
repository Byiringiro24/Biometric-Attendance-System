import { allAsync, getAsync, runAsync } from '../models/database.js';
import { TabletClient } from '../utils/tablet-client.js';
import { v4 as uuidv4 } from 'uuid';

export async function pullLogs(req, res) {
  try {
    const { tabletId, readMark = 0 } = req.body;

    // Get tablet URL
    const tablet = await getAsync('SELECT url FROM tablets WHERE id = ?', [tabletId]);
    if (!tablet) {
      return res.status(404).json({ error: 'Tablet not found' });
    }

    // Connect to tablet and pull logs
    const client = new TabletClient(tablet.url);
    const result = await client.pullLogs(readMark);

    // Save logs to database
    if (result.logs && Array.isArray(result.logs)) {
      for (const log of result.logs) {
        const id = uuidv4();
        await runAsync(
          `INSERT OR IGNORE INTO attendance 
           (id, studentId, studentName, timestamp, method, direction, tabletId) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, log.studentId, log.studentName, log.timestamp, log.method, log.direction, tabletId]
        );
      }
    }

    res.json({ success: true, logsImported: result.logs?.length || 0 });
  } catch (error) {
    console.error('Pull logs error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getDeviceStatus(req, res) {
  try {
    const { tabletId } = req.query;

    // Get tablet URL
    const tablet = await getAsync('SELECT url FROM tablets WHERE id = ?', [tabletId]);
    if (!tablet) {
      return res.status(404).json({ error: 'Tablet not found' });
    }

    // Get status from tablet
    const client = new TabletClient(tablet.url);
    const status = await client.getDeviceStatus();

    // Update tablet status in DB
    await runAsync('UPDATE tablets SET lastSync = CURRENT_TIMESTAMP WHERE id = ?', [tabletId]);

    res.json(status);
  } catch (error) {
    console.error('Get device status error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function connectDevice(req, res) {
  try {
    const { tabletId, ip, port, license } = req.body;

    // Get tablet URL
    const tablet = await getAsync('SELECT url FROM tablets WHERE id = ?', [tabletId]);
    if (!tablet) {
      return res.status(404).json({ error: 'Tablet not found' });
    }

    // Connect device through tablet
    const client = new TabletClient(tablet.url);
    const result = await client.connectDevice(ip, port, license);

    // Save device config
    const deviceId = uuidv4();
    await runAsync(
      `INSERT OR REPLACE INTO devices 
       (id, tabletId, ip, port, license, connected) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [deviceId, tabletId, ip, port, license, result.success ? 1 : 0]
    );

    res.json(result);
  } catch (error) {
    console.error('Connect device error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function disconnectDevice(req, res) {
  try {
    const { tabletId } = req.body;

    // Get tablet URL
    const tablet = await getAsync('SELECT url FROM tablets WHERE id = ?', [tabletId]);
    if (!tablet) {
      return res.status(404).json({ error: 'Tablet not found' });
    }

    // Disconnect device through tablet
    const client = new TabletClient(tablet.url);
    const result = await client.disconnectDevice();

    // Update device status
    await runAsync('UPDATE devices SET connected = 0 WHERE tabletId = ?', [tabletId]);

    res.json(result);
  } catch (error) {
    console.error('Disconnect device error:', error);
    res.status(500).json({ error: error.message });
  }
}

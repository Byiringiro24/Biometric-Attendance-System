import { allAsync, getAsync, runAsync } from '../models/database.js';
import { TabletClient } from '../utils/tablet-client.js';
import { v4 as uuidv4 } from 'uuid';

export async function getAllTablets(req, res) {
  try {
    const tablets = await allAsync('SELECT * FROM tablets ORDER BY created_at DESC');
    res.json(tablets);
  } catch (error) {
    console.error('Get tablets error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function registerTablet(req, res) {
  try {
    const { name, ip, port = 5000 } = req.body;

    if (!name || !ip) {
      return res.status(400).json({ error: 'Name and IP are required' });
    }

    const id = uuidv4();
    const url = `http://${ip}:${port}`;

    // Verify tablet is reachable
    try {
      const client = new TabletClient(url);
      await client.health();
    } catch (error) {
      return res.status(400).json({ error: 'Tablet is not reachable at ' + url });
    }

    // Save tablet
    await runAsync(
      `INSERT INTO tablets (id, name, ip, port, url, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, ip, port, url, 'online']
    );

    const tablet = await getAsync('SELECT * FROM tablets WHERE id = ?', [id]);
    res.status(201).json(tablet);
  } catch (error) {
    console.error('Register tablet error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateTabletStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['online', 'offline', 'error'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await runAsync('UPDATE tablets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [status, id]);

    const tablet = await getAsync('SELECT * FROM tablets WHERE id = ?', [id]);
    res.json(tablet);
  } catch (error) {
    console.error('Update tablet status error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function removeTablet(req, res) {
  try {
    const { id } = req.params;

    await runAsync('DELETE FROM tablets WHERE id = ?', [id]);
    await runAsync('DELETE FROM devices WHERE tabletId = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove tablet error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function checkTabletHealth(req, res) {
  try {
    const { id } = req.params;

    const tablet = await getAsync('SELECT url FROM tablets WHERE id = ?', [id]);
    if (!tablet) {
      return res.status(404).json({ error: 'Tablet not found' });
    }

    try {
      const client = new TabletClient(tablet.url);
      const health = await client.health();
      
      // Update status
      await runAsync('UPDATE tablets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['online', id]);

      res.json({ healthy: true, ...health });
    } catch (error) {
      // Update status
      await runAsync('UPDATE tablets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['offline', id]);

      res.json({ healthy: false, error: error.message });
    }
  } catch (error) {
    console.error('Check tablet health error:', error);
    res.status(500).json({ error: error.message });
  }
}

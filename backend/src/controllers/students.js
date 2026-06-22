import { allAsync, getAsync, runAsync } from '../models/database.js';
import { TabletClient } from '../utils/tablet-client.js';
import { v4 as uuidv4 } from 'uuid';

export async function getAllStudents(req, res) {
  try {
    const classFilter = req.query.class || req.query.className;

    let query = 'SELECT * FROM students WHERE status = "active"';
    const params = [];

    if (classFilter) {
      query += ' AND class = ?';
      params.push(classFilter);
    }

    query += ' ORDER BY name ASC';

    const students = await allAsync(query, params);
    const normalized = students.map((student) => ({
      ...student,
      studentId: student.id,
      className: student.class,
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    const student = await getAsync('SELECT * FROM students WHERE id = ?', [id]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function createStudent(req, res) {
  try {
    const id = String(req.body.id || req.body.studentId || '').trim().toUpperCase();
    const name = String(req.body.name || '').trim();
    const studentClass = req.body.class || req.body.className || '';
    const pushToDevice = req.body.pushToDevice ?? true;

    // Validate
    if (!id || !name) {
      return res.status(400).json({ error: 'Student ID and name are required' });
    }

    // Check if exists
    const existing = await getAsync('SELECT id FROM students WHERE id = ?', [id]);
    if (existing) {
      return res.status(400).json({ error: 'Student ID already exists' });
    }

    // Create student
    await runAsync(
      `INSERT INTO students (id, name, class, pushToDevice) VALUES (?, ?, ?, ?)`,
      [id, name, studentClass, pushToDevice ? 1 : 0]
    );

    // Push to device if enabled
    if (pushToDevice) {
      try {
        const tablets = await allAsync('SELECT id, url FROM tablets WHERE status = "online"');
        for (const tablet of tablets) {
          const client = new TabletClient(tablet.url);
          await client.addUser(id, name);
        }
      } catch (error) {
        console.warn('Could not push student to device:', error.message);
      }
    }

    const student = await getAsync('SELECT * FROM students WHERE id = ?', [id]);
    res.status(201).json({ ...student, studentId: student.id, className: student.class });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const { name, class: studentClass, status, pushToDevice } = req.body;

    // Check if exists
    const existing = await getAsync('SELECT * FROM students WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (studentClass) {
      updates.push('class = ?');
      params.push(studentClass);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (pushToDevice !== undefined) {
      updates.push('pushToDevice = ?');
      params.push(pushToDevice ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await runAsync(
      `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await getAsync('SELECT * FROM students WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteStudent(req, res) {
  try {
    const { id } = req.params;

    // Check if exists
    const student = await getAsync('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete from device if needed
    try {
      const tablets = await allAsync('SELECT id, url FROM tablets WHERE status = "online"');
      for (const tablet of tablets) {
        const client = new TabletClient(tablet.url);
        await client.deleteUser(id);
      }
    } catch (error) {
      console.warn('Could not delete student from device:', error.message);
    }

    // Mark as deleted
    await runAsync('UPDATE students SET status = "deleted" WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: error.message });
  }
}

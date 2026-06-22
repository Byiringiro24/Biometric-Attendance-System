import express from 'express';
import * as attendanceCtrl from '../controllers/attendance.js';

const router = express.Router();

router.get('/', attendanceCtrl.getAttendance);
router.get('/today', attendanceCtrl.getTodayAttendance);
router.get('/stats', attendanceCtrl.getAttendanceStats);
router.get('/daily-stats', attendanceCtrl.getDailyStats);

export default router;

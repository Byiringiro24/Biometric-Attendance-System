import express from 'express';
import * as studentCtrl from '../controllers/students.js';

const router = express.Router();

router.get('/', studentCtrl.getAllStudents);
router.get('/:id', studentCtrl.getStudentById);
router.post('/', studentCtrl.createStudent);
router.put('/:id', studentCtrl.updateStudent);
router.delete('/:id', studentCtrl.deleteStudent);

export default router;

import express from 'express';
import * as tabletCtrl from '../controllers/tablets.js';

const router = express.Router();

router.get('/', tabletCtrl.getAllTablets);
router.post('/', tabletCtrl.registerTablet);
router.put('/:id/status', tabletCtrl.updateTabletStatus);
router.delete('/:id', tabletCtrl.removeTablet);
router.get('/:id/health', tabletCtrl.checkTabletHealth);

export default router;

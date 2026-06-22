import express from 'express';
import * as deviceCtrl from '../controllers/device.js';

const router = express.Router();

router.post('/pull-logs', deviceCtrl.pullLogs);
router.get('/status', deviceCtrl.getDeviceStatus);
router.post('/connect', deviceCtrl.connectDevice);
router.post('/disconnect', deviceCtrl.disconnectDevice);

export default router;

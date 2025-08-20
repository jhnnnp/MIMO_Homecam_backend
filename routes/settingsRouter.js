const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');

router.get('/', SettingsController.getSettings);
router.put('/', SettingsController.updateSettings);
router.delete('/reset', SettingsController.resetSettings);
router.get('/:key', SettingsController.getSettingValue);
router.put('/:key', SettingsController.updateSettingValue);
router.get('/cameras/:id', SettingsController.getCameraSettings);
router.put('/cameras/:id', SettingsController.updateCameraSettings);
router.post('/export', SettingsController.exportSettings);
router.post('/import', SettingsController.importSettings);

module.exports = router;

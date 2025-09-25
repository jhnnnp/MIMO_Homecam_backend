const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');
const authMiddleware = require('../middlewares/authMiddleware');

// 모든 설정 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// ==================== 통합 설정 API ====================
router.get('/', SettingsController.getSettings);

// ==================== 핵심 설정 API ====================
router.get('/core', SettingsController.getCoreSettings);
router.put('/core', SettingsController.updateCoreSettings);

// ==================== 커스텀 설정 API ====================
router.get('/custom', SettingsController.getCustomSettings);
router.put('/custom/:key', SettingsController.updateCustomSetting);
router.delete('/custom/:key', SettingsController.deleteCustomSetting);

// ==================== 설정 초기화 API ====================
router.post('/reset', SettingsController.resetSettings);

module.exports = router;

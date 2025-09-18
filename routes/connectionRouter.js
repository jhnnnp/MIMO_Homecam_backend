const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const ConnectionController = require('../controllers/ConnectionController');

// 모든 연결 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

/**
 * 하이브리드 연결 관리 라우트 (PIN + QR)
 */

// 연결 생성 (PIN 또는 QR 선택)
router.post('/generate', ConnectionController.generateConnection);

// 연결 실행 (PIN 입력 또는 QR 스캔)
router.post('/connect', ConnectionController.connectToCamera);

// 연결 갱신 (TTL 만료 대응)
router.post('/:connectionId/refresh', ConnectionController.refreshConnection);

// 연결 상태 확인
router.get('/:connectionId/status', ConnectionController.getConnectionStatus);

// 연결 종료
router.delete('/:connectionId', ConnectionController.disconnectConnection);

// 활성 연결 목록 조회
router.get('/active', ConnectionController.getActiveConnections);

module.exports = router; 
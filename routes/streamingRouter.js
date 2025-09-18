/**
 * streamingRouter - WebRTC 스트리밍 관련 라우터
 * 
 * API 엔드포인트:
 * - POST   /streaming/camera/register         카메라 스트림 등록
 * - DELETE /streaming/camera/:cameraId/unregister  카메라 스트림 등록 해제
 * - POST   /streaming/viewer/connect          뷰어 연결
 * - DELETE /streaming/viewer/:viewerId/disconnect   뷰어 연결 해제
 * - GET    /streaming/sessions/active         활성 세션 조회
 * - GET    /streaming/sessions/:sessionId/stats      세션 통계 조회
 * - POST   /streaming/signaling/:sessionId    시그널링 메시지 중계
 * - POST   /streaming/sessions/:sessionId/heartbeat  하트비트
 * - POST   /streaming/sessions/:sessionId/quality    품질 변경
 * - GET    /streaming/health                  서비스 상태 확인
 */

const express = require('express');
const router = express.Router();

// 미들웨어
const authenticateToken = require('../middlewares/authMiddleware');

// 컨트롤러
const StreamingController = require('../controllers/StreamingController');

// 인증 미들웨어 적용 (모든 스트리밍 API는 인증 필요)
router.use(authenticateToken);

// 카메라 스트림 관리
router.post('/camera/register', StreamingController.registerCameraStream);
router.delete('/camera/:cameraId/unregister', StreamingController.unregisterCameraStream);

// 뷰어 연결 관리
router.post('/viewer/connect', StreamingController.connectViewer);
router.delete('/viewer/:viewerId/disconnect', StreamingController.disconnectViewer);

// 세션 관리
router.get('/sessions/active', StreamingController.getActiveSessions);
router.get('/sessions/:sessionId/stats', StreamingController.getSessionStats);
router.post('/sessions/:sessionId/heartbeat', StreamingController.sessionHeartbeat);
router.post('/sessions/:sessionId/quality', StreamingController.changeStreamQuality);

// WebRTC 시그널링
router.post('/signaling/:sessionId', StreamingController.relaySignalingMessage);

// 서비스 상태
router.get('/health', StreamingController.getStreamingHealth);

module.exports = router;

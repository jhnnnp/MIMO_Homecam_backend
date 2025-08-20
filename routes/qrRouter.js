const express = require("express");
const router = express.Router();
const QRController = require("../controllers/QRController");
const authMiddleware = require("../middlewares/authMiddleware");

// 모든 QR 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// QR 코드 생성 (카메라 소유자용)
router.post("/cameras/:cameraId/qr-code", QRController.generateQRCode);

// QR 코드 스캔 (뷰어용)
router.post("/scan", QRController.scanQRCode);

// 연결 상태 확인
router.get("/connections/:connectionId/status", QRController.getConnectionStatus);

// 연결 종료
router.delete("/connections/:connectionId", QRController.disconnectConnection);

// 활성 연결 목록 조회
router.get("/connections", QRController.getActiveConnections);

module.exports = router;

const express = require("express");
const router = express.Router();
const CameraController = require("../controllers/CameraController");
const QRController = require("../controllers/QRController");
const authMiddleware = require("../middlewares/authMiddleware");

// 모든 카메라 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

router.get("/", CameraController.getCameras);
router.get("/:id", CameraController.getCameraById);
router.put("/:id", CameraController.updateCamera);
router.delete("/:id", CameraController.deleteCamera);
router.post("/:id/heartbeat", CameraController.updateCameraHeartbeat);
router.get("/:id/stats", CameraController.getCameraStats);
router.get("/:id/stream", CameraController.getLiveStream);

// QR 코드 관련 엔드포인트 추가
router.post("/:id/qr-code", QRController.generateQRCode);

module.exports = router;

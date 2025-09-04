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

// 홈캠 등록/검색 엔드포인트
router.post("/register", CameraController.registerCamera);
router.get("/search/:connectionId", CameraController.searchCameraByConnectionId);
router.post("/connect/:connectionId", CameraController.connectToCamera);

// PIN 코드 기반 홈캠 검색/연결 엔드포인트
router.get("/search/pin/:pinCode", CameraController.searchCameraByPinCode);
router.post("/connect/pin/:pinCode", CameraController.connectToCameraByPinCode);

module.exports = router;

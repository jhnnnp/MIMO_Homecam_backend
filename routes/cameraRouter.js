const express = require("express");
const router = express.Router();
const CameraController = require("../controllers/CameraController");
const QRController = require("../controllers/QRController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
    requireViewerAccess,
    requireControllerAccess,
    requireAdminAccess,
    checkCameraOwnership
} = require("../middlewares/cameraPermissionMiddleware");

// 모든 카메라 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

router.get("/", CameraController.getCameras);
router.get("/count", CameraController.getCameraCount);
router.get("/:id", requireViewerAccess(), CameraController.getCameraById);
router.put("/:id", requireControllerAccess(), CameraController.updateCamera);
router.delete("/:id", checkCameraOwnership, CameraController.deleteCamera);
router.post("/:id/heartbeat", requireControllerAccess(), CameraController.updateCameraHeartbeat);
router.get("/:id/stats", requireViewerAccess(), CameraController.getCameraStats);
router.get("/:id/stream", requireViewerAccess(), CameraController.getLiveStream);

// QR 코드 관련 엔드포인트 추가
router.post("/:id/qr-code", requireControllerAccess(), QRController.generateQRCode);

// 홈캠 등록 엔드포인트
router.post("/register-with-code", QRController.registerCameraWithCode);

// 홈캠 PIN 발급 (새로운 분리된 API)
router.post("/generate-pin", CameraController.generatePinCode);

// 홈캠 등록/검색 엔드포인트 (기존)
router.post("/register", CameraController.registerCamera);
router.get("/search/:connectionId", CameraController.searchCameraByConnectionId);
router.post("/connect/:connectionId", CameraController.connectToCamera);

// PIN 코드 기반 홈캠 검색/연결 엔드포인트
router.get("/search/pin/:pinCode", CameraController.searchCameraByPinCode);
router.post("/connect/pin/:pinCode", CameraController.connectToCameraByPinCode);

// ==================== 카메라 공유 관련 라우트 ====================
// router.post("/:id/share", checkCameraOwnership, CameraController.shareCameraWithUser); // 함수 미구현
// router.delete("/:id/share/:userId", checkCameraOwnership, CameraController.revokeCameraShare); // 함수 미구현
// router.get("/:id/shared-users", checkCameraOwnership, CameraController.getCameraSharedUsers); // 함수 미구현
// router.get("/:id/permission", requireViewerAccess(), CameraController.getUserCameraPermission); // 함수 미구현

module.exports = router;

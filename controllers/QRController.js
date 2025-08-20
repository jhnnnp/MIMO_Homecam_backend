const qrCodeService = require("../service/qrCodeService");
const { Camera } = require("../models");

/**
 * QR 코드 생성
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateQRCode = async (req, res) => {
    try {
        const { cameraId } = req.params;
        const userId = req.user.userId;

        // 카메라 정보 조회
        const camera = await Camera.findOne({
            where: {
                id: cameraId,
                user_id: userId
            }
        });

        if (!camera) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: "E_NOT_FOUND",
                    message: "카메라를 찾을 수 없습니다."
                }
            });
        }

        // QR 코드 생성
        const qrData = await qrCodeService.generateQRCode({
            cameraId: camera.id,
            name: camera.name
        });

        res.json({
            ok: true,
            data: qrData
        });
    } catch (error) {
        console.error("QR 코드 생성 에러:", error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: "E_QR_GENERATION_FAILED",
                message: "QR 코드 생성에 실패했습니다."
            }
        });
    }
};

/**
 * QR 코드 스캔 처리
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.scanQRCode = async (req, res) => {
    try {
        const { qrCode } = req.body;
        const userId = req.user.userId;
        const deviceId = req.headers["device-id"] || "unknown";

        if (!qrCode) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: "E_MISSING_QR_CODE",
                    message: "QR 코드가 필요합니다."
                }
            });
        }

        // QR 코드 스캔 처리
        const connectionInfo = await qrCodeService.handleQRScan(qrCode, deviceId, userId);

        res.json({
            ok: true,
            data: connectionInfo
        });
    } catch (error) {
        console.error("QR 코드 스캔 에러:", error.message);
        res.status(400).json({
            ok: false,
            error: {
                code: "E_QR_SCAN_FAILED",
                message: error.message
            }
        });
    }
};

/**
 * 연결 상태 확인
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getConnectionStatus = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const status = qrCodeService.getConnectionStatus(connectionId);

        res.json({
            ok: true,
            data: status
        });
    } catch (error) {
        console.error("연결 상태 확인 에러:", error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: "E_CONNECTION_STATUS_FAILED",
                message: "연결 상태를 확인할 수 없습니다."
            }
        });
    }
};

/**
 * 연결 종료
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.disconnectConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user.userId;

        await qrCodeService.disconnectConnection(connectionId, userId);

        res.json({
            ok: true,
            message: "연결이 종료되었습니다."
        });
    } catch (error) {
        console.error("연결 종료 에러:", error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: "E_DISCONNECT_FAILED",
                message: "연결 종료에 실패했습니다."
            }
        });
    }
};

/**
 * 활성 연결 목록 조회
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActiveConnections = async (req, res) => {
    try {
        const userId = req.user.userId;
        const connections = qrCodeService.getActiveConnections(userId);

        res.json({
            ok: true,
            data: { connections }
        });
    } catch (error) {
        console.error("활성 연결 목록 조회 에러:", error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: "E_CONNECTIONS_FETCH_FAILED",
                message: "연결 목록을 조회할 수 없습니다."
            }
        });
    }
};

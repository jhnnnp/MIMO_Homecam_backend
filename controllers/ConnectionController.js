const qrCodeService = require("../service/qrCodeService");
const pinCodeService = require("../service/pinCodeService");
const { Camera } = require("../models");
const { buildLiveStreamUrl, buildCameraStreamUrl } = require("../utils/mediaUrlBuilder");
const asyncHandler = require("../utils/asyncHandler");
const { ok, errors } = require("../utils/responseHelpers");

/**
 * 하이브리드 연결 컨트롤러 (PIN + QR)
 * 설명: PIN 코드와 QR 코드 방식을 통합 관리
 */

/**
 * [POST] /api/connections/generate
 * 연결 방식 선택 (PIN 또는 QR)
 */
exports.generateConnection = asyncHandler(async (req, res) => {
    const { cameraId, connectionType = 'pin', customPin } = req.body;
    const userId = req.user.userId;

    if (!cameraId) {
        return errors.validation(res, '카메라 ID가 필요합니다.');
    }

    if (!['pin', 'qr'].includes(connectionType)) {
        return errors.validation(res, '연결 방식은 pin 또는 qr이어야 합니다.');
    }

    // 카메라 정보 조회
    const camera = await Camera.findOne({
        where: { device_id: String(cameraId), user_id: userId }
    });

    if (!camera) {
        return errors.notFound(res, '카메라를 찾을 수 없습니다.');
    }

    const cameraInfo = {
        cameraId: camera.device_id,
        name: camera.name,
        userId: userId
    };

    let connectionData;

    try {
        if (connectionType === 'pin') {
            // PIN 코드 생성
            connectionData = await pinCodeService.generatePinCode(cameraInfo, customPin);
        } else {
            // QR 코드 생성
            connectionData = await qrCodeService.generateQRCode(cameraInfo);
        }

        // 퍼블리셔용 미디어 서버 URL 제공
        const publisherUrl = buildCameraStreamUrl(String(cameraId));

        ok(res, {
            ...connectionData,
            cameraInfo: {
                id: camera.id,
                name: camera.name,
                deviceId: camera.device_id
            },
            media: {
                publisherUrl
            },
            message: `${connectionType.toUpperCase()} 방식 연결이 생성되었습니다.`
        }, null, 201);

    } catch (error) {
        console.error(`${connectionType.toUpperCase()} 생성 에러:`, error.message);
        errors.internal(res, `${connectionType.toUpperCase()} 생성에 실패했습니다.`);
    }
});

/**
 * [POST] /api/connections/connect
 * 연결 실행 (PIN 입력 또는 QR 스캔)
 */
exports.connectToCamera = asyncHandler(async (req, res) => {
    const { connectionType, pinCode, qrCode } = req.body;
    const userId = req.user.userId;
    const deviceId = req.headers["device-id"] || "unknown";

    if (!['pin', 'qr'].includes(connectionType)) {
        return errors.validation(res, '연결 방식은 pin 또는 qr이어야 합니다.');
    }

    let connectionInfo;

    try {
        if (connectionType === 'pin') {
            if (!pinCode) {
                return errors.validation(res, 'PIN 코드가 필요합니다.');
            }
            connectionInfo = await pinCodeService.connectWithPin(pinCode, userId, deviceId);
        } else {
            if (!qrCode) {
                return errors.validation(res, 'QR 코드가 필요합니다.');
            }
            connectionInfo = await qrCodeService.handleQRScan(qrCode, deviceId, userId);
        }

        // 뷰어용 미디어 서버 URL 제공
        const cameraId = String(connectionInfo.cameraId);
        const viewerUrl = buildLiveStreamUrl(cameraId, String(userId));

        ok(res, {
            ...connectionInfo,
            media: {
                viewerUrl
            },
            message: `${connectionType.toUpperCase()} 방식으로 연결되었습니다.`
        });

    } catch (error) {
        console.error(`${connectionType.toUpperCase()} 연결 에러:`, error.message);
        errors.badRequest(res, error.message);
    }
});

/**
 * [POST] /api/connections/:connectionId/refresh
 * 연결 갱신 (5분 TTL 대응)
 */
exports.refreshConnection = asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const { connectionType } = req.body;
    const userId = req.user.userId;

    if (!['pin', 'qr'].includes(connectionType)) {
        return errors.validation(res, '연결 방식은 pin 또는 qr이어야 합니다.');
    }

    try {
        // 기존 연결에서 카메라 정보 가져오기
        const existingConnection = connectionType === 'pin'
            ? await pinCodeService.getPinStatus(connectionId)
            : await qrCodeService.getConnectionStatus(connectionId);

        if (!existingConnection.cameraInfo) {
            return errors.notFound(res, '기존 연결을 찾을 수 없습니다.');
        }

        const cameraInfo = {
            cameraId: existingConnection.cameraInfo.cameraId,
            name: existingConnection.cameraInfo.cameraName,
            userId: userId
        };

        let newConnectionData;

        if (connectionType === 'pin') {
            newConnectionData = await pinCodeService.refreshPinCode(connectionId, cameraInfo);
        } else {
            newConnectionData = await qrCodeService.refreshQRCode(connectionId, cameraInfo);
        }

        ok(res, {
            ...newConnectionData,
            message: `${connectionType.toUpperCase()} 연결이 갱신되었습니다.`
        });

    } catch (error) {
        console.error(`${connectionType.toUpperCase()} 갱신 에러:`, error.message);
        errors.internal(res, `연결 갱신에 실패했습니다: ${error.message}`);
    }
});

/**
 * [GET] /api/connections/:connectionId/status
 * 연결 상태 확인
 */
exports.getConnectionStatus = asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const { type } = req.query; // pin 또는 qr

    try {
        let status;

        if (type === 'pin') {
            status = await pinCodeService.getPinStatus(connectionId);
        } else if (type === 'qr') {
            status = await qrCodeService.getConnectionStatus(connectionId);
        } else {
            // 타입이 명시되지 않은 경우 둘 다 시도
            status = await qrCodeService.getConnectionStatus(connectionId);
            if (status.status === 'error') {
                status = await pinCodeService.getPinStatus(connectionId);
            }
        }

        ok(res, status);

    } catch (error) {
        console.error("연결 상태 확인 에러:", error.message);
        errors.internal(res, "연결 상태를 확인할 수 없습니다.");
    }
});

/**
 * [DELETE] /api/connections/:connectionId
 * 연결 종료
 */
exports.disconnectConnection = asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const { connectionType } = req.body;
    const userId = req.user.userId;

    try {
        if (connectionType === 'pin') {
            await pinCodeService.disconnectPin(connectionId, userId);
        } else if (connectionType === 'qr') {
            await qrCodeService.disconnectConnection(connectionId, userId);
        } else {
            // 타입이 명시되지 않은 경우 둘 다 시도
            try {
                await qrCodeService.disconnectConnection(connectionId, userId);
            } catch {
                await pinCodeService.disconnectPin(connectionId, userId);
            }
        }

        ok(res, {
            message: "연결이 종료되었습니다."
        });

    } catch (error) {
        console.error("연결 종료 에러:", error.message);
        errors.internal(res, "연결 종료에 실패했습니다.");
    }
});

/**
 * [GET] /api/connections/active
 * 활성 연결 목록 조회
 */
exports.getActiveConnections = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    try {
        const qrConnections = await qrCodeService.getActiveConnections(userId);
        const pinConnections = await pinCodeService.getActiveConnections ?
            await pinCodeService.getActiveConnections(userId) :
            { total: 0, cameras: 0, viewers: 0 };

        ok(res, {
            qr: qrConnections,
            pin: pinConnections,
            total: {
                cameras: (qrConnections.cameras || 0) + (pinConnections.cameras || 0),
                viewers: (qrConnections.viewers || 0) + (pinConnections.viewers || 0),
                connections: (qrConnections.total || 0) + (pinConnections.total || 0)
            }
        });

    } catch (error) {
        console.error("활성 연결 조회 에러:", error.message);
        errors.internal(res, "연결 목록을 조회할 수 없습니다.");
    }
}); 
const { v4: uuidv4 } = require("uuid");
const connectionManager = require("../utils/connectionManager");

/**
 * QR 코드 서비스
 * 설명: 홈캠과 뷰어 기기 간 QR 코드 연결 관리
 */

class QRCodeService {
    constructor() {
        // Redis 기반 connectionManager 사용으로 메모리 상태 제거
    }

    /**
     * QR 코드 생성
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {Object} QR 코드 데이터
     */
    async generateQRCode(cameraInfo) {
        try {
            // 고유 connectionId 생성 및 Redis에 등록
            const connectionId = await connectionManager.generateUniqueConnectionId(() => uuidv4().slice(0, 10));

            const cameraData = {
                cameraId: cameraInfo.cameraId,
                cameraName: cameraInfo.name,
                status: 'waiting',
                createdAt: new Date().toISOString()
            };

            await connectionManager.registerCameraWithId(cameraData, connectionId);

            const qrCode = this.generateQRString(connectionId, cameraInfo);

            console.log(`QR 코드 생성: ${connectionId} for camera ${cameraInfo.cameraId}`);

            return {
                connectionId,
                qrCode,
                // TTL은 Redis에 설정되어 있으므로 유추값 제공 (5분)
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            };
        } catch (error) {
            console.error("QR 코드 생성 실패:", error);
            throw error;
        }
    }

    /**
     * QR 코드 문자열 생성
     * @param {string} connectionId - 연결 ID
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {string} QR 코드 문자열
     */
    generateQRString(connectionId, cameraInfo) {
        const qrData = {
            type: "mimo_camera_connect",
            connectionId: connectionId,
            cameraId: cameraInfo.cameraId,
            serverUrl: process.env.WS_SERVER_URL || `ws://localhost:${process.env.PORT || 4001}`,
            timestamp: Date.now(),
            version: "1.0.0"
        };

        return JSON.stringify(qrData);
    }

    /**
     * QR 코드 스캔 처리
     * @param {string} qrCode - 스캔된 QR 코드
     * @param {string} viewerDeviceId - 뷰어 기기 ID
     * @param {string} viewerUserId - 뷰어 사용자 ID
     * @returns {Object} 연결 정보
     */
    async handleQRScan(qrCode, viewerDeviceId, viewerUserId) {
        try {
            let parsed;
            try {
                parsed = JSON.parse(qrCode);
            } catch (_) {
                parsed = { connectionId: qrCode };
            }

            const connectionId = parsed.connectionId;
            if (!connectionId) {
                throw new Error('유효하지 않은 QR 데이터입니다.');
            }

            const cameraData = await connectionManager.getCamera(connectionId);
            if (!cameraData) {
                throw new Error('QR 코드가 올바르지 않거나 만료되었습니다.');
            }

            const viewerInfo = {
                deviceId: viewerDeviceId,
                userId: viewerUserId,
                connectedAt: new Date().toISOString(),
                status: 'connected'
            };

            await connectionManager.registerViewerConnection(connectionId, viewerUserId, viewerInfo);

            console.log(`QR 연결 성공: ${connectionId} - 뷰어: ${viewerUserId}`);

            return {
                connectionId,
                cameraId: cameraData.cameraId || cameraData.id,
                cameraName: cameraData.cameraName || cameraData.name,
                status: 'connected'
            };
        } catch (error) {
            console.error("QR 스캔 처리 실패:", error);
            throw error;
        }
    }

    /**
     * 연결 상태 확인
     * @param {string} connectionId - 연결 ID
     * @returns {Object} 연결 상태
     */
    getConnectionStatus(connectionId) {
        return {
            id: connectionId,
            status: 'unknown'
        };
    }

    /**
     * 연결 종료
     * @param {string} connectionId - 연결 ID
     * @param {string} userId - 사용자 ID (선택사항)
     */
    async disconnectConnection(connectionId, userId = null) {
        try {
            if (userId) {
                await connectionManager.unregisterViewerConnection(connectionId, userId);
            } else {
                // 연결된 모든 뷰어 해제 후 카메라 등록 해제
                const viewers = await connectionManager.getViewerConnections(connectionId);
                await Promise.all(viewers.map(v => connectionManager.unregisterViewerConnection(connectionId, v.viewerId)));
                await connectionManager.unregisterCamera(connectionId);
            }
            console.log(`연결 종료: ${connectionId}`);
        } catch (error) {
            console.error("연결 종료 실패:", error);
            throw error;
        }
    }

    /**
     * 만료된 QR 코드 정리
     */
    cleanupExpiredQRCodes() {
        // Redis TTL 사용으로 별도 정리 불필요
    }

    /**
     * 활성 연결 목록 조회
     * @param {string} userId - 사용자 ID (선택사항)
     * @returns {Array} 연결 목록
     */
    getActiveConnections(userId = null) {
        // 상세 목록은 필요 시 connectionManager에 헬퍼 추가하여 구현 가능
        return [];
    }

    /**
     * 카메라별 연결 정보 조회
     * @param {string} cameraId - 카메라 ID
     * @returns {Object} 연결 정보
     */
    getConnectionsByCamera(cameraId) {
        // Redis 기반으로 전환 후 여기서는 직접 조회하지 않음
        return [];
    }
}

// 싱글톤 인스턴스 생성
const qrCodeService = new QRCodeService();

// 주기적으로 만료된 QR 코드 정리 (5분마다)
setInterval(() => {
    qrCodeService.cleanupExpiredQRCodes();
}, 5 * 60 * 1000);

module.exports = qrCodeService;

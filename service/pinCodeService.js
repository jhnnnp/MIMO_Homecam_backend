const connectionManager = require("../utils/connectionManager");

/**
 * PIN 코드 서비스
 * 설명: 6자리 PIN 코드 기반 연결 관리
 */

class PinCodeService {
    constructor() {
        // PIN 코드 TTL 설정 (10분)
        this.PIN_TTL = 10 * 60 * 1000;
    }

    /**
     * 6자리 PIN 코드 생성
     * @returns {string} 6자리 PIN 코드
     */
    generateSixDigitPin() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    /**
     * PIN 코드 기반 카메라 등록
     * @param {Object} cameraInfo - 카메라 정보
     * @param {string} customPin - 사용자 지정 PIN (선택사항)
     * @returns {Object} PIN 코드 데이터
     */
    async generatePinCode(cameraInfo, customPin = null) {
        try {
            // PIN 코드 생성 (사용자 지정 또는 자동 생성)
            let pinCode = customPin;
            if (!pinCode) {
                pinCode = await connectionManager.generateUniqueConnectionId(
                    () => this.generateSixDigitPin()
                );
            }

            const cameraData = {
                cameraId: cameraInfo.cameraId,
                cameraName: cameraInfo.name,
                userId: cameraInfo.userId,
                status: 'waiting',
                createdAt: new Date().toISOString(),
                type: 'pin' // PIN 방식으로 생성됨을 표시
            };

            await connectionManager.registerCameraWithId(cameraData, pinCode);

            const expiresAt = new Date(Date.now() + this.PIN_TTL);

            console.log(`📌 PIN 코드 생성: ${pinCode} for camera ${cameraInfo.cameraId} (만료: ${expiresAt})`);

            return {
                connectionId: pinCode,
                pinCode: pinCode,
                expiresAt,
                ttl: this.PIN_TTL,
                type: 'pin'
            };
        } catch (error) {
            console.error("PIN 코드 생성 실패:", error);
            throw error;
        }
    }

    /**
     * PIN 코드 검증 및 연결
     * @param {string} pinCode - PIN 코드
     * @param {string} viewerUserId - 뷰어 사용자 ID
     * @param {string} viewerDeviceId - 뷰어 기기 ID
     * @returns {Object} 연결 정보
     */
    async connectWithPin(pinCode, viewerUserId, viewerDeviceId = 'unknown') {
        try {
            // PIN 코드 검증
            if (!/^\d{6}$/.test(pinCode)) {
                throw new Error('PIN 코드는 6자리 숫자여야 합니다.');
            }

            const cameraData = await connectionManager.getCamera(pinCode);
            if (!cameraData) {
                throw new Error('PIN 코드가 올바르지 않거나 만료되었습니다.');
            }

            const viewerInfo = {
                deviceId: viewerDeviceId,
                userId: viewerUserId,
                connectedAt: new Date().toISOString(),
                status: 'connected',
                connectionType: 'pin'
            };

            await connectionManager.registerViewerConnection(pinCode, viewerUserId, viewerInfo);

            console.log(`🔗 PIN 연결 성공: ${pinCode} - 뷰어: ${viewerUserId}`);

            return {
                connectionId: pinCode,
                pinCode: pinCode,
                cameraId: cameraData.cameraId || cameraData.id,
                cameraName: cameraData.cameraName || cameraData.name,
                status: 'connected',
                connectionType: 'pin'
            };
        } catch (error) {
            console.error("PIN 연결 처리 실패:", error);
            throw error;
        }
    }

    /**
     * PIN 코드 갱신
     * @param {string} oldPinCode - 기존 PIN 코드
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {Object} 새로운 PIN 코드 데이터
     */
    async refreshPinCode(oldPinCode, cameraInfo) {
        try {
            // 기존 연결 확인
            const existingData = await connectionManager.getCamera(oldPinCode);
            if (!existingData) {
                throw new Error('기존 PIN 연결을 찾을 수 없습니다.');
            }

            // 새로운 PIN 코드 생성
            const newPinData = await this.generatePinCode(cameraInfo);

            // 기존 연결 해제
            await connectionManager.unregisterCamera(oldPinCode);

            console.log(`🔄 PIN 코드 갱신: ${oldPinCode} → ${newPinData.pinCode}`);

            return newPinData;
        } catch (error) {
            console.error("PIN 코드 갱신 실패:", error);
            throw error;
        }
    }

    /**
     * PIN 연결 상태 확인
     * @param {string} pinCode - PIN 코드
     * @returns {Object} 연결 상태
     */
    async getPinStatus(pinCode) {
        try {
            const cameraData = await connectionManager.getCamera(pinCode);
            const viewers = await connectionManager.getViewerConnections(pinCode);

            return {
                pinCode: pinCode,
                status: cameraData ? 'active' : 'expired',
                cameraInfo: cameraData,
                viewers: viewers.length,
                viewerList: viewers
            };
        } catch (error) {
            return {
                pinCode: pinCode,
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * PIN 연결 종료
     * @param {string} pinCode - PIN 코드
     * @param {string} userId - 사용자 ID (선택사항)
     */
    async disconnectPin(pinCode, userId = null) {
        try {
            if (userId) {
                await connectionManager.unregisterViewerConnection(pinCode, userId);
                console.log(`🔌 PIN 뷰어 연결 종료: ${pinCode} - ${userId}`);
            } else {
                // 연결된 모든 뷰어 해제 후 카메라 등록 해제
                const viewers = await connectionManager.getViewerConnections(pinCode);
                await Promise.all(viewers.map(v => connectionManager.unregisterViewerConnection(pinCode, v.viewerId)));
                await connectionManager.unregisterCamera(pinCode);
                console.log(`🔌 PIN 전체 연결 종료: ${pinCode}`);
            }
        } catch (error) {
            console.error("PIN 연결 종료 실패:", error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스 생성
const pinCodeService = new PinCodeService();

module.exports = pinCodeService; 
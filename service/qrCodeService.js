const { v4: uuidv4 } = require("uuid");
const QRCode = require('qrcode');
const crypto = require('crypto');
const connectionManager = require("../utils/connectionManager");

/**
 * QR 코드 서비스
 * 설명: 홈캠과 뷰어 기기 간 QR 코드 연결 관리 (이미지 생성 + 보안 강화)
 */

class QRCodeService {
    constructor() {
        // QR 코드 생성 옵션
        this.qrOptions = {
            type: 'png',
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        };

        // TTL 설정 (5분)
        this.QR_TTL = 5 * 60 * 1000;

        // 서명 시크릿
        this.QR_SECRET = process.env.QR_SECRET || 'mimo_qr_secret_key_change_me';
    }

    /**
     * QR 코드 서명 생성
     * @param {string} connectionId - 연결 ID
     * @param {string} cameraId - 카메라 ID
     * @param {number} timestamp - 타임스탬프
     * @returns {string} 서명
     */
    generateSignature(connectionId, cameraId, timestamp) {
        const payload = `${connectionId}:${cameraId}:${timestamp}`;
        return crypto.createHmac('sha256', this.QR_SECRET).update(payload).digest('hex');
    }

    /**
     * QR 코드 서명 검증
     * @param {string} connectionId - 연결 ID
     * @param {string} cameraId - 카메라 ID
     * @param {number} timestamp - 타임스탬프
     * @param {string} signature - 서명
     * @returns {boolean} 검증 결과
     */
    verifySignature(connectionId, cameraId, timestamp, signature) {
        const expectedSignature = this.generateSignature(connectionId, cameraId, timestamp);
        return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    }

    /**
     * QR 코드 생성 (이미지 포함 + 보안 강화)
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {Object} QR 코드 데이터 + 이미지
     */
    async generateQRCode(cameraInfo) {
        try {
            // 고유 connectionId 생성 및 Redis에 등록
            const connectionId = await connectionManager.generateUniqueConnectionId(() => uuidv4().slice(0, 10));

            const cameraData = {
                cameraId: cameraInfo.cameraId,
                cameraName: cameraInfo.name,
                status: 'waiting',
                createdAt: new Date().toISOString(),
                type: 'qr' // QR 방식으로 생성됨을 표시
            };

            await connectionManager.registerCameraWithId(cameraData, connectionId);

            const qrData = this.generateQRString(connectionId, cameraInfo);

            // QR 코드 이미지 생성
            const qrImageBuffer = await QRCode.toBuffer(qrData, this.qrOptions);
            const qrImageBase64 = qrImageBuffer.toString('base64');
            const qrImageDataUrl = `data:image/png;base64,${qrImageBase64}`;

            const expiresAt = new Date(Date.now() + this.QR_TTL);

            console.log(`🔄 QR 코드 생성: ${connectionId} for camera ${cameraInfo.cameraId} (만료: ${expiresAt})`);

            return {
                connectionId,
                qrCode: qrData,
                qrImage: qrImageDataUrl,
                expiresAt,
                ttl: this.QR_TTL,
                type: 'qr'
            };
        } catch (error) {
            console.error("QR 코드 생성 실패:", error);
            throw error;
        }
    }

    /**
     * QR 코드 문자열 생성 (보안 서명 포함)
     * @param {string} connectionId - 연결 ID
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {string} QR 코드 문자열
     */
    generateQRString(connectionId, cameraInfo) {
        const timestamp = Date.now();
        const signature = this.generateSignature(connectionId, cameraInfo.cameraId, timestamp);

        const qrData = {
            type: "mimo_camera_connect",
            connectionId: connectionId,
            cameraId: cameraInfo.cameraId,
            cameraName: cameraInfo.name,
            serverUrl: process.env.WS_SERVER_URL || `ws://localhost:${process.env.PORT || 4001}`,
            timestamp: timestamp,
            signature: signature, // 보안 서명 추가
            version: "2.0.0" // 버전 업그레이드
        };

        return JSON.stringify(qrData);
    }

    /**
     * QR 코드 스캔 처리 (서명 검증 포함)
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

            const { connectionId, cameraId, timestamp, signature } = parsed;

            if (!connectionId) {
                throw new Error('유효하지 않은 QR 데이터입니다.');
            }

            // 서명 검증 (v2.0.0 이상)
            if (parsed.version && parsed.version >= "2.0.0") {
                if (!signature || !timestamp || !cameraId) {
                    throw new Error('QR 코드 보안 정보가 누락되었습니다.');
                }

                // 타임스탬프 만료 확인
                const age = Date.now() - timestamp;
                if (age > this.QR_TTL) {
                    throw new Error('QR 코드가 만료되었습니다.');
                }

                // 서명 검증
                if (!this.verifySignature(connectionId, cameraId, timestamp, signature)) {
                    throw new Error('QR 코드 서명이 올바르지 않습니다.');
                }
            }

            const cameraData = await connectionManager.getCamera(connectionId);
            if (!cameraData) {
                throw new Error('QR 코드가 올바르지 않거나 만료되었습니다.');
            }

            const viewerInfo = {
                deviceId: viewerDeviceId,
                userId: viewerUserId,
                connectedAt: new Date().toISOString(),
                status: 'connected',
                connectionType: 'qr'
            };

            await connectionManager.registerViewerConnection(connectionId, viewerUserId, viewerInfo);

            console.log(`🔗 QR 연결 성공: ${connectionId} - 뷰어: ${viewerUserId}`);

            return {
                connectionId,
                cameraId: cameraData.cameraId || cameraData.id,
                cameraName: cameraData.cameraName || cameraData.name,
                status: 'connected',
                connectionType: 'qr'
            };
        } catch (error) {
            console.error("QR 스캔 처리 실패:", error);
            throw error;
        }
    }

    /**
     * QR 코드 갱신
     * @param {string} connectionId - 기존 연결 ID
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {Object} 새로운 QR 코드 데이터
     */
    async refreshQRCode(connectionId, cameraInfo) {
        try {
            // 기존 연결 확인
            const existingData = await connectionManager.getCamera(connectionId);
            if (!existingData) {
                throw new Error('기존 QR 연결을 찾을 수 없습니다.');
            }

            // 새로운 QR 코드 생성
            const newQRData = await this.generateQRCode(cameraInfo);

            // 기존 연결 해제
            await connectionManager.unregisterCamera(connectionId);

            console.log(`🔄 QR 코드 갱신: ${connectionId} → ${newQRData.connectionId}`);

            return newQRData;
        } catch (error) {
            console.error("QR 코드 갱신 실패:", error);
            throw error;
        }
    }

    /**
     * 연결 상태 확인
     * @param {string} connectionId - 연결 ID
     * @returns {Object} 연결 상태
     */
    async getConnectionStatus(connectionId) {
        try {
            const cameraData = await connectionManager.getCamera(connectionId);
            const viewers = await connectionManager.getViewerConnections(connectionId);

            return {
                id: connectionId,
                status: cameraData ? 'active' : 'expired',
                cameraInfo: cameraData,
                viewers: viewers.length,
                viewerList: viewers
            };
        } catch (error) {
            return {
                id: connectionId,
                status: 'error',
                error: error.message
            };
        }
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
                console.log(`🔌 뷰어 연결 종료: ${connectionId} - ${userId}`);
            } else {
                // 연결된 모든 뷰어 해제 후 카메라 등록 해제
                const viewers = await connectionManager.getViewerConnections(connectionId);
                await Promise.all(viewers.map(v => connectionManager.unregisterViewerConnection(connectionId, v.viewerId)));
                await connectionManager.unregisterCamera(connectionId);
                console.log(`🔌 전체 연결 종료: ${connectionId}`);
            }
        } catch (error) {
            console.error("연결 종료 실패:", error);
            throw error;
        }
    }

    /**
     * 만료된 QR 코드 정리
     */
    async cleanupExpiredQRCodes() {
        // Redis TTL 사용으로 자동 정리되지만, 추가 로깅을 위해 유지
        const stats = await connectionManager.getStats();
        console.log(`🧹 QR 정리 완료 - 활성 카메라: ${stats.activeCameras}, 활성 뷰어: ${stats.activeViewers}`);
    }

    /**
     * 관리자 테스트 홈캠 자동 생성
     * @param {number} userId - 사용자 ID
     * @returns {Object} 생성 결과
     */
    async createAdminTestCamera(userId) {
        const { Camera } = require('../models');

        try {
            // 이미 관리자 테스트 홈캠이 있는지 확인
            const existingAdminCamera = await Camera.findOne({
                where: {
                    device_id: 'ADMIN_TEST_991011',
                    user_id: userId
                }
            });

            if (existingAdminCamera) {
                return {
                    camera: existingAdminCamera,
                    message: '관리자 테스트 홈캠이 이미 존재합니다.',
                    isExisting: true
                };
            }

            // 새 관리자 테스트 홈캠 생성
            const adminTestCamera = await Camera.create({
                user_id: userId,
                name: '관리자 테스트 홈캠',
                device_id: 'ADMIN_TEST_991011',
                location: '테스트 환경',
                status: 'online',
                last_seen: new Date(),
                last_heartbeat: new Date(),
                settings: {
                    resolution: '1080p',
                    fps: 30,
                    quality: 'high',
                    isAdminTest: true
                }
            });

            console.log(`🔧 관리자 테스트 홈캠 생성됨: ${adminTestCamera.name} (ID: ${adminTestCamera.id})`);

            return {
                camera: adminTestCamera,
                message: '관리자 테스트 홈캠이 생성되었습니다.',
                isExisting: false
            };
        } catch (error) {
            console.error('관리자 테스트 홈캠 생성 실패:', error);
            throw new Error('관리자 테스트 홈캠을 생성할 수 없습니다.');
        }
    }

    /**
     * PIN/QR 코드로 홈캠 등록
     * @param {string} code - PIN 코드 또는 QR 데이터
     * @param {string} type - 'pin' | 'qr'
     * @param {number} userId - 사용자 ID
     * @returns {Object} 등록 결과
     */
    async registerCameraWithCode(code, type, userId) {
        const { Camera } = require('../models');

        try {
            let cameraInfo;

            if (type === 'qr') {
                // QR 코드 데이터 파싱
                try {
                    cameraInfo = JSON.parse(code);

                    // MIMO QR 코드 검증
                    if (cameraInfo.type !== 'MIMO_CAMERA') {
                        throw new Error('MIMO 카메라 QR 코드가 아닙니다.');
                    }

                    // 만료 시간 검증
                    if (cameraInfo.expiresAt && Date.now() > cameraInfo.expiresAt) {
                        throw new Error('만료된 QR 코드입니다.');
                    }
                } catch (parseError) {
                    throw new Error('유효하지 않은 QR 코드 형식입니다.');
                }
            } else if (type === 'pin') {
                // PIN 코드 검증
                if (!/^\d{6}$/.test(code)) {
                    throw new Error('PIN 코드는 6자리 숫자여야 합니다.');
                }

                cameraInfo = {
                    pinCode: code,
                    cameraId: `MIMO_${code}_${Date.now()}`,
                    cameraName: `홈캠 ${code}`
                };
            } else {
                throw new Error('지원하지 않는 코드 타입입니다.');
            }

            // 이미 등록된 카메라인지 확인
            const existingCamera = await Camera.findOne({
                where: {
                    device_id: cameraInfo.cameraId,
                    user_id: userId
                }
            });

            if (existingCamera) {
                throw new Error('이미 등록된 홈캠입니다.');
            }

            // 새 카메라 등록
            const newCamera = await Camera.create({
                user_id: userId,
                name: cameraInfo.cameraName || `홈캠 ${cameraInfo.pinCode}`,
                device_id: cameraInfo.cameraId,
                location: '홈',
                status: 'online',
                last_seen: new Date(),
                last_heartbeat: new Date(),
                settings: {
                    resolution: '1080p',
                    fps: 30,
                    quality: 'high'
                }
            });

            return {
                camera: newCamera,
                connectionInfo: cameraInfo,
                message: '홈캠이 성공적으로 등록되었습니다.'
            };
        } catch (error) {
            console.error('홈캠 등록 실패:', error);
            throw error;
        }
    }

    /**
     * 활성 연결 목록 조회
     * @param {string} userId - 사용자 ID (선택사항)
     * @returns {Array} 연결 목록
     */
    async getActiveConnections(userId = null) {
        try {
            const stats = await connectionManager.getStats();
            return {
                total: stats.totalConnections,
                cameras: stats.activeCameras,
                viewers: stats.activeViewers
            };
        } catch (error) {
            console.error("활성 연결 조회 실패:", error);
            return { total: 0, cameras: 0, viewers: 0 };
        }
    }
}

// 싱글톤 인스턴스 생성
const qrCodeService = new QRCodeService();

// 주기적으로 만료된 QR 코드 정리 (5분마다)
setInterval(() => {
    qrCodeService.cleanupExpiredQRCodes();
}, 5 * 60 * 1000);

module.exports = qrCodeService;

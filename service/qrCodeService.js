const { v4: uuidv4 } = require("uuid");
const { Camera, User } = require("../models");
const { Op } = require("sequelize");

/**
 * QR 코드 서비스
 * 설명: 홈캠과 뷰어 기기 간 QR 코드 연결 관리
 */

class QRCodeService {
    constructor() {
        this.activeConnections = new Map(); // connectionId -> connection info
        this.qrCodes = new Map(); // qrCode -> connection info
    }

    /**
     * QR 코드 생성
     * @param {Object} cameraInfo - 카메라 정보
     * @returns {Object} QR 코드 데이터
     */
    async generateQRCode(cameraInfo) {
        try {
            const connectionId = uuidv4();
            const qrCode = this.generateQRString(connectionId, cameraInfo);
            
            const connectionInfo = {
                id: connectionId,
                qrCode: qrCode,
                cameraId: cameraInfo.cameraId,
                cameraName: cameraInfo.name,
                status: "waiting",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5분 유효
                viewers: []
            };

            // 연결 정보 저장
            this.activeConnections.set(connectionId, connectionInfo);
            this.qrCodes.set(qrCode, connectionInfo);

            console.log(`QR 코드 생성: ${connectionId} for camera ${cameraInfo.cameraId}`);

            return {
                connectionId,
                qrCode,
                expiresAt: connectionInfo.expiresAt
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
            serverUrl: process.env.SERVER_URL || "ws://localhost:4001",
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
            const connectionInfo = this.qrCodes.get(qrCode);
            
            if (!connectionInfo) {
                throw new Error("유효하지 않은 QR 코드입니다.");
            }

            if (connectionInfo.status !== "waiting") {
                throw new Error("이미 연결된 QR 코드입니다.");
            }

            if (new Date() > connectionInfo.expiresAt) {
                throw new Error("QR 코드가 만료되었습니다.");
            }

            // 뷰어 정보 추가
            const viewerInfo = {
                deviceId: viewerDeviceId,
                userId: viewerUserId,
                connectedAt: new Date()
            };

            connectionInfo.viewers.push(viewerInfo);
            connectionInfo.status = "connected";

            // 카메라 정보 업데이트
            await Camera.update(
                { 
                    status: "online",
                    last_seen: new Date()
                },
                { 
                    where: { id: connectionInfo.cameraId }
                }
            );

            console.log(`QR 연결 성공: ${connectionInfo.id} - 뷰어: ${viewerUserId}`);

            return {
                connectionId: connectionInfo.id,
                cameraId: connectionInfo.cameraId,
                cameraName: connectionInfo.cameraName,
                status: "connected"
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
        const connection = this.activeConnections.get(connectionId);
        
        if (!connection) {
            return { status: "not_found" };
        }

        return {
            id: connection.id,
            status: connection.status,
            cameraId: connection.cameraId,
            cameraName: connection.cameraName,
            viewers: connection.viewers,
            createdAt: connection.createdAt,
            expiresAt: connection.expiresAt
        };
    }

    /**
     * 연결 종료
     * @param {string} connectionId - 연결 ID
     * @param {string} userId - 사용자 ID (선택사항)
     */
    async disconnectConnection(connectionId, userId = null) {
        try {
            const connection = this.activeConnections.get(connectionId);
            
            if (!connection) {
                throw new Error("연결을 찾을 수 없습니다.");
            }

            if (userId) {
                // 특정 뷰어만 연결 해제
                connection.viewers = connection.viewers.filter(
                    viewer => viewer.userId !== userId
                );

                if (connection.viewers.length === 0) {
                    // 모든 뷰어가 연결 해제된 경우
                    this.activeConnections.delete(connectionId);
                    this.qrCodes.delete(connection.qrCode);
                }
            } else {
                // 전체 연결 종료
                this.activeConnections.delete(connectionId);
                this.qrCodes.delete(connection.qrCode);
            }

            // 카메라 상태 업데이트
            await Camera.update(
                { 
                    status: "offline",
                    last_seen: new Date()
                },
                { 
                    where: { id: connection.cameraId }
                }
            );

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
        const now = new Date();
        
        for (const [connectionId, connection] of this.activeConnections.entries()) {
            if (now > connection.expiresAt) {
                this.activeConnections.delete(connectionId);
                this.qrCodes.delete(connection.qrCode);
                console.log(`만료된 QR 코드 정리: ${connectionId}`);
            }
        }
    }

    /**
     * 활성 연결 목록 조회
     * @param {string} userId - 사용자 ID (선택사항)
     * @returns {Array} 연결 목록
     */
    getActiveConnections(userId = null) {
        const connections = Array.from(this.activeConnections.values());
        
        if (userId) {
            return connections.filter(connection => 
                connection.viewers.some(viewer => viewer.userId === userId)
            );
        }
        
        return connections;
    }

    /**
     * 카메라별 연결 정보 조회
     * @param {string} cameraId - 카메라 ID
     * @returns {Object} 연결 정보
     */
    getConnectionsByCamera(cameraId) {
        const connections = Array.from(this.activeConnections.values());
        return connections.filter(connection => connection.cameraId === cameraId);
    }
}

// 싱글톤 인스턴스 생성
const qrCodeService = new QRCodeService();

// 주기적으로 만료된 QR 코드 정리 (5분마다)
setInterval(() => {
    qrCodeService.cleanupExpiredQRCodes();
}, 5 * 60 * 1000);

module.exports = qrCodeService;

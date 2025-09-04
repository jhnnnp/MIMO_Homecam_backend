/**
 * Redis 기반 연결 관리자
 * 전역 상태 대신 Redis를 사용하여 카메라 등록 및 연결 상태 관리
 */

const Redis = require('ioredis');
const { nanoid } = require('nanoid');

class ConnectionManager {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        this.TTL = 10 * 60; // 10분
    }

    /**
     * 카메라 등록
     * @param {Object} cameraData - 카메라 데이터
     * @returns {string} connectionId
     */
    async registerCamera(cameraData) {
        const connectionId = nanoid(10);
        const key = `camera:${connectionId}`;

        await this.redis.setex(key, this.TTL, JSON.stringify({
            ...cameraData,
            connectionId,
            registeredAt: new Date().toISOString()
        }));

        return connectionId;
    }

    /**
     * 지정된 ID로 카메라 등록 (PIN 코드 등)
     * @param {Object} cameraData - 카메라 데이터
     * @param {string} connectionId - 연결 ID (PIN 코드)
     */
    async registerCameraWithId(cameraData, connectionId) {
        const key = `camera:${connectionId}`;

        await this.redis.setex(key, this.TTL, JSON.stringify({
            ...cameraData,
            connectionId,
            registeredAt: new Date().toISOString()
        }));

        return connectionId;
    }

    /**
     * 카메라 정보 조회
     * @param {string} connectionId - 연결 ID
     * @returns {Object|null} 카메라 데이터
     */
    async getCamera(connectionId) {
        const key = `camera:${connectionId}`;
        const data = await this.redis.get(key);

        if (!data) return null;

        return JSON.parse(data);
    }

    /**
     * 카메라 등록 해제
     * @param {string} connectionId - 연결 ID
     */
    async unregisterCamera(connectionId) {
        const key = `camera:${connectionId}`;
        await this.redis.del(key);
    }

    /**
     * 뷰어 연결 등록
     * @param {string} connectionId - 카메라 연결 ID
     * @param {string} viewerId - 뷰어 ID
     * @param {Object} connectionData - 연결 데이터
     */
    async registerViewerConnection(connectionId, viewerId, connectionData) {
        const key = `viewer:${connectionId}:${viewerId}`;

        await this.redis.setex(key, this.TTL, JSON.stringify({
            ...connectionData,
            connectionId,
            viewerId,
            connectedAt: new Date().toISOString()
        }));
    }

    /**
     * 뷰어 연결 정보 조회
     * @param {string} connectionId - 카메라 연결 ID
     * @param {string} viewerId - 뷰어 ID
     * @returns {Object|null} 연결 데이터
     */
    async getViewerConnection(connectionId, viewerId) {
        const key = `viewer:${connectionId}:${viewerId}`;
        const data = await this.redis.get(key);

        if (!data) return null;

        return JSON.parse(data);
    }

    /**
     * 뷰어 연결 해제
     * @param {string} connectionId - 카메라 연결 ID
     * @param {string} viewerId - 뷰어 ID
     */
    async unregisterViewerConnection(connectionId, viewerId) {
        const key = `viewer:${connectionId}:${viewerId}`;
        await this.redis.del(key);
    }

    /**
     * PIN 코드로 뷰어 연결
     * @param {string} pinCode - PIN 코드 (connectionId)
     * @param {string} viewerId - 뷰어 ID
     * @returns {Object} 연결 데이터
     */
    async connectViewer(pinCode, viewerId) {
        // 카메라 정보 조회
        const cameraData = await this.getCamera(pinCode);

        if (!cameraData) {
            throw new Error('PIN 코드가 올바르지 않거나 만료되었습니다.');
        }

        // 연결 데이터 생성
        const connectionData = {
            cameraId: cameraData.cameraId,
            cameraName: cameraData.cameraName,
            connectionId: pinCode,
            viewerId,
            connectedAt: new Date().toISOString(),
            status: 'connected'
        };

        // 뷰어 연결 등록
        await this.registerViewerConnection(pinCode, viewerId, connectionData);

        return connectionData;
    }

    /**
     * 카메라의 모든 뷰어 연결 조회
     * @param {string} connectionId - 카메라 연결 ID
     * @returns {Array} 뷰어 연결 목록
     */
    async getViewerConnections(connectionId) {
        const pattern = `viewer:${connectionId}:*`;
        const keys = await this.redis.keys(pattern);

        if (keys.length === 0) return [];

        const connections = await Promise.all(
            keys.map(async (key) => {
                const data = await this.redis.get(key);
                return data ? JSON.parse(data) : null;
            })
        );

        return connections.filter(Boolean);
    }

    /**
     * 연결 ID 중복 체크 및 재생성
     * @param {Function} generateId - ID 생성 함수
     * @param {number} maxRetries - 최대 재시도 횟수
     * @returns {string} 고유한 연결 ID
     */
    async generateUniqueConnectionId(generateId = () => nanoid(10), maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            const connectionId = generateId();
            const exists = await this.getCamera(connectionId);

            if (!exists) {
                return connectionId;
            }
        }

        throw new Error('연결 ID 생성에 실패했습니다. 다시 시도해주세요.');
    }

    /**
     * 만료된 연결 정리
     */
    async cleanupExpiredConnections() {
        // Redis의 TTL 기능을 사용하므로 별도 정리 로직 불필요
        // 필요시 추가 정리 로직 구현
    }

    /**
 * 카메라 하트비트 업데이트
 * @param {string} connectionId - 연결 ID
 * @param {Object} heartbeatData - 하트비트 데이터
 */
    async updateCameraHeartbeat(connectionId, heartbeatData) {
        const key = `camera:${connectionId}`;
        const existingData = await this.redis.get(key);

        if (existingData) {
            const cameraData = JSON.parse(existingData);
            const updatedData = {
                ...cameraData,
                ...heartbeatData,
                lastHeartbeat: new Date().toISOString()
            };

            await this.redis.setex(key, this.TTL, JSON.stringify(updatedData));
        }
    }

    /**
     * 연결 상태 통계
     * @returns {Object} 통계 정보
     */
    async getStats() {
        const cameraKeys = await this.redis.keys('camera:*');
        const viewerKeys = await this.redis.keys('viewer:*');

        return {
            activeCameras: cameraKeys.length,
            activeViewers: viewerKeys.length,
            totalConnections: cameraKeys.length + viewerKeys.length
        };
    }
}

// 싱글톤 인스턴스
const connectionManager = new ConnectionManager();

module.exports = connectionManager; 
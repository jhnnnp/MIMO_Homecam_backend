const connectionManager = require('./connectionManager');

/**
 * 연결 자동 갱신 및 만료 관리 스케줄러
 * 설명: PIN/QR 연결의 TTL 관리 및 자동 갱신
 */

class ConnectionScheduler {
    constructor(websocketServer = null) {
        this.websocketServer = websocketServer;
        this.schedules = new Map(); // connectionId -> schedule info

        // 기본 설정
        this.QR_TTL = 5 * 60 * 1000; // 5분
        this.PIN_TTL = 10 * 60 * 1000; // 10분
        this.WARNING_TIME = 60 * 1000; // 만료 1분 전 경고

        this.startPeriodicCleanup();
    }

    /**
     * 연결 스케줄 등록
     * @param {string} connectionId - 연결 ID
     * @param {string} connectionType - 연결 타입 ('pin' 또는 'qr')
     * @param {number} ttl - TTL (밀리초)
     * @param {Array} userIds - 알림 받을 사용자 ID 목록
     */
    scheduleConnection(connectionId, connectionType, ttl, userIds = []) {
        // 기존 스케줄 정리
        this.unscheduleConnection(connectionId);

        const now = Date.now();
        const expiresAt = now + ttl;
        const warningAt = expiresAt - this.WARNING_TIME;

        const scheduleInfo = {
            connectionId,
            connectionType,
            expiresAt,
            userIds,
            warningTimer: null,
            expiryTimer: null
        };

        // 만료 경고 타이머
        if (warningAt > now) {
            scheduleInfo.warningTimer = setTimeout(() => {
                this.sendExpirationWarning(connectionId, connectionType, 60, userIds);
            }, warningAt - now);
        }

        // 만료 타이머
        scheduleInfo.expiryTimer = setTimeout(() => {
            this.handleConnectionExpiry(connectionId, connectionType, userIds);
        }, ttl);

        this.schedules.set(connectionId, scheduleInfo);

        console.log(`⏰ 연결 스케줄 등록: ${connectionId} (${connectionType}) - 만료: ${new Date(expiresAt)}`);
    }

    /**
     * 연결 스케줄 해제
     * @param {string} connectionId - 연결 ID
     */
    unscheduleConnection(connectionId) {
        const scheduleInfo = this.schedules.get(connectionId);
        if (scheduleInfo) {
            if (scheduleInfo.warningTimer) {
                clearTimeout(scheduleInfo.warningTimer);
            }
            if (scheduleInfo.expiryTimer) {
                clearTimeout(scheduleInfo.expiryTimer);
            }
            this.schedules.delete(connectionId);
            console.log(`⏰ 연결 스케줄 해제: ${connectionId}`);
        }
    }

    /**
     * 만료 경고 전송
     * @param {string} connectionId - 연결 ID
     * @param {string} connectionType - 연결 타입
     * @param {number} timeLeft - 남은 시간 (초)
     * @param {Array} userIds - 사용자 ID 목록
     */
    sendExpirationWarning(connectionId, connectionType, timeLeft, userIds) {
        if (this.websocketServer) {
            this.websocketServer.broadcastConnectionExpirationWarning(
                connectionId,
                connectionType,
                timeLeft,
                userIds
            );
        }
        console.log(`⚠️ 만료 경고: ${connectionId} (${connectionType}) - ${timeLeft}초 남음`);
    }

    /**
     * 연결 만료 처리
     * @param {string} connectionId - 연결 ID
     * @param {string} connectionType - 연결 타입
     * @param {Array} userIds - 사용자 ID 목록
     */
    async handleConnectionExpiry(connectionId, connectionType, userIds) {
        try {
            // 연결 상태 확인
            const cameraData = await connectionManager.getCamera(connectionId);
            if (!cameraData) {
                console.log(`⏰ 이미 만료된 연결: ${connectionId}`);
                this.unscheduleConnection(connectionId);
                return;
            }

            // WebSocket으로 만료 알림
            if (this.websocketServer) {
                this.websocketServer.broadcastConnectionStatusUpdate(
                    connectionId,
                    connectionType,
                    'expired',
                    userIds
                );
            }

            console.log(`⏰ 연결 만료: ${connectionId} (${connectionType})`);
            this.unscheduleConnection(connectionId);

        } catch (error) {
            console.error(`연결 만료 처리 실패: ${connectionId}`, error);
        }
    }

    /**
     * 연결 갱신 스케줄 업데이트
     * @param {string} oldConnectionId - 기존 연결 ID
     * @param {string} newConnectionId - 새 연결 ID
     * @param {string} connectionType - 연결 타입
     * @param {number} ttl - 새 TTL
     * @param {Array} userIds - 사용자 ID 목록
     */
    rescheduleConnection(oldConnectionId, newConnectionId, connectionType, ttl, userIds) {
        // 기존 스케줄 해제
        this.unscheduleConnection(oldConnectionId);

        // 새 스케줄 등록
        this.scheduleConnection(newConnectionId, connectionType, ttl, userIds);

        // WebSocket으로 갱신 알림
        if (this.websocketServer) {
            this.websocketServer.broadcastConnectionRefresh(
                oldConnectionId,
                newConnectionId,
                connectionType,
                userIds
            );
        }

        console.log(`🔄 연결 스케줄 갱신: ${oldConnectionId} → ${newConnectionId}`);
    }

    /**
     * 주기적 정리 작업
     */
    startPeriodicCleanup() {
        // 1분마다 실행
        setInterval(async () => {
            try {
                const now = Date.now();
                const expiredConnections = [];

                // 만료된 스케줄 찾기
                for (const [connectionId, scheduleInfo] of this.schedules.entries()) {
                    if (scheduleInfo.expiresAt <= now) {
                        expiredConnections.push(connectionId);
                    }
                }

                // 만료된 스케줄 정리
                for (const connectionId of expiredConnections) {
                    this.unscheduleConnection(connectionId);
                }

                if (expiredConnections.length > 0) {
                    console.log(`🧹 만료된 스케줄 정리: ${expiredConnections.length}개`);
                }

                // Redis 통계 로그
                const stats = await connectionManager.getStats();
                console.log(`📊 연결 통계 - 카메라: ${stats.activeCameras}, 뷰어: ${stats.activeViewers}, 스케줄: ${this.schedules.size}`);

            } catch (error) {
                console.error('주기적 정리 작업 실패:', error);
            }
        }, 60000); // 1분
    }

    /**
     * 활성 스케줄 정보 조회
     * @returns {Array} 스케줄 목록
     */
    getActiveSchedules() {
        const schedules = [];
        const now = Date.now();

        for (const [connectionId, scheduleInfo] of this.schedules.entries()) {
            schedules.push({
                connectionId,
                connectionType: scheduleInfo.connectionType,
                expiresAt: new Date(scheduleInfo.expiresAt),
                timeLeft: Math.max(0, scheduleInfo.expiresAt - now),
                userIds: scheduleInfo.userIds
            });
        }

        return schedules.sort((a, b) => a.expiresAt - b.expiresAt);
    }

    /**
     * 특정 연결의 남은 시간 조회
     * @param {string} connectionId - 연결 ID
     * @returns {number} 남은 시간 (밀리초), 없으면 -1
     */
    getTimeLeft(connectionId) {
        const scheduleInfo = this.schedules.get(connectionId);
        if (!scheduleInfo) return -1;

        return Math.max(0, scheduleInfo.expiresAt - Date.now());
    }

    /**
     * 스케줄러 종료
     */
    shutdown() {
        // 모든 타이머 정리
        for (const connectionId of this.schedules.keys()) {
            this.unscheduleConnection(connectionId);
        }
        console.log('🔄 연결 스케줄러 종료');
    }
}

module.exports = ConnectionScheduler; 
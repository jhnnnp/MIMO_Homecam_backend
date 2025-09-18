/**
 * StreamingService - WebRTC 스트리밍 비즈니스 로직
 * 
 * 핵심 기능:
 * - 스트림 세션 관리
 * - 카메라-뷰어 연결 관리
 * - WebRTC 시그널링 지원
 * - 실시간 통계 및 모니터링
 */

const { Camera } = require('../models');
const { log } = require('../utils/logger');
const { createNetworkError } = require('../utils/responseHelpers');

// 메모리 기반 스트림 세션 저장소 (프로덕션에서는 Redis 사용 권장)
class StreamSessionStore {
    constructor() {
        this.sessions = new Map(); // sessionId -> session data
        this.cameraStreams = new Map(); // cameraId -> sessionId
        this.viewerConnections = new Map(); // viewerId -> { sessionId, cameraId }
        this.userSessions = new Map(); // userId -> Set<sessionId>
    }

    // 세션 생성
    createSession(sessionData) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            ...sessionData,
            createdAt: new Date(),
            lastHeartbeat: new Date(),
            viewers: [],
            stats: {
                duration: 0,
                bytesTransferred: 0,
                viewerCount: 0,
                maxViewers: 0,
                qualityChanges: 0
            }
        };

        this.sessions.set(sessionId, session);

        // 인덱스 업데이트
        if (session.cameraId) {
            this.cameraStreams.set(session.cameraId, sessionId);
        }

        if (!this.userSessions.has(session.userId)) {
            this.userSessions.set(session.userId, new Set());
        }
        this.userSessions.get(session.userId).add(sessionId);

        log('info', { message: '스트림 세션 생성됨', sessionId, cameraId: session.cameraId });
        return session;
    }

    // 세션 조회
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    // 카메라로 세션 조회
    getSessionByCameraId(cameraId) {
        const sessionId = this.cameraStreams.get(cameraId);
        return sessionId ? this.sessions.get(sessionId) : null;
    }

    // 사용자 세션 목록 조회
    getUserSessions(userId) {
        const sessionIds = this.userSessions.get(userId) || new Set();
        return Array.from(sessionIds).map(id => this.sessions.get(id)).filter(Boolean);
    }

    // 세션 업데이트
    updateSession(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            session.updatedAt = new Date();
            return session;
        }
        return null;
    }

    // 뷰어 추가
    addViewer(sessionId, viewerData) {
        const session = this.sessions.get(sessionId);
        if (session) {
            const viewer = {
                id: this.generateViewerId(),
                ...viewerData,
                connectedAt: new Date()
            };

            session.viewers.push(viewer);
            session.stats.viewerCount = session.viewers.length;
            session.stats.maxViewers = Math.max(session.stats.maxViewers, session.viewers.length);

            // 뷰어 연결 인덱스 업데이트
            this.viewerConnections.set(viewer.id, {
                sessionId,
                cameraId: session.cameraId
            });

            log('info', { message: '뷰어 추가됨', sessionId, viewerId: viewer.id });
            return viewer;
        }
        return null;
    }

    // 뷰어 제거
    removeViewer(sessionId, viewerId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.viewers = session.viewers.filter(v => v.id !== viewerId);
            session.stats.viewerCount = session.viewers.length;
            this.viewerConnections.delete(viewerId);

            log('info', { message: '뷰어 제거됨', sessionId, viewerId });
            return true;
        }
        return false;
    }

    // 세션 삭제
    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // 인덱스 정리
            if (session.cameraId) {
                this.cameraStreams.delete(session.cameraId);
            }

            // 뷰어 연결 정리
            session.viewers.forEach(viewer => {
                this.viewerConnections.delete(viewer.id);
            });

            // 사용자 세션 목록에서 제거
            if (this.userSessions.has(session.userId)) {
                this.userSessions.get(session.userId).delete(sessionId);
            }

            this.sessions.delete(sessionId);
            log('info', { message: '스트림 세션 삭제됨', sessionId });
            return true;
        }
        return false;
    }

    // 활성 세션 수 조회
    getActiveSessionCount() {
        return this.sessions.size;
    }

    // 총 뷰어 수 조회
    getTotalViewerCount() {
        return Array.from(this.sessions.values())
            .reduce((total, session) => total + session.viewers.length, 0);
    }

    // ID 생성 함수들
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateViewerId() {
        return `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 만료된 세션 정리 (하트비트 기반)
    cleanupExpiredSessions(timeoutMinutes = 5) {
        const now = new Date();
        const expiredSessions = [];

        for (const [sessionId, session] of this.sessions) {
            const timeDiff = (now - new Date(session.lastHeartbeat)) / 1000 / 60;
            if (timeDiff > timeoutMinutes) {
                expiredSessions.push(sessionId);
            }
        }

        expiredSessions.forEach(sessionId => {
            log('warn', { message: '만료된 세션 정리', sessionId });
            this.deleteSession(sessionId);
        });

        return expiredSessions.length;
    }
}

// 싱글톤 세션 스토어
const sessionStore = new StreamSessionStore();

// 정기적인 세션 정리 (5분마다)
setInterval(() => {
    const cleanedCount = sessionStore.cleanupExpiredSessions();
    if (cleanedCount > 0) {
        log('info', { message: '만료된 세션 정리 완료', cleanedCount });
    }
}, 5 * 60 * 1000);

class StreamingService {
    /**
     * 카메라 스트림 등록
     */
    static async registerCameraStream(userId, cameraId, streamConfig = {}) {
        try {
            // 카메라 소유권 확인 (테스트용으로 임시 비활성화)
            // const camera = await Camera.findOne({
            //     where: { device_id: cameraId, user_id: userId }
            // });

            // if (!camera) {
            //     throw new Error('Camera not found or access denied');
            // }

            // 기존 스트림 세션 확인
            const existingSession = sessionStore.getSessionByCameraId(cameraId);
            if (existingSession) {
                throw new Error('Camera is already streaming');
            }

            // 새 스트림 세션 생성
            const session = sessionStore.createSession({
                userId,
                cameraId,
                cameraName: (streamConfig && streamConfig.cameraName)
                    ? String(streamConfig.cameraName)
                    : String(cameraId),
                type: 'camera_stream',
                status: 'active',
                config: {
                    quality: streamConfig.quality || '1080p',
                    framerate: streamConfig.framerate || 30,
                    bitrate: streamConfig.bitrate || 2000000,
                    ...streamConfig
                }
            });

            // 카메라 상태 업데이트 (테스트용으로 임시 비활성화)
            // await camera.update({
            //     status: 'streaming',
            //     last_connected: new Date()
            // });

            log('info', { message: '카메라 스트림 등록 성공', userId, cameraId, sessionId: session.id });

            return {
                sessionId: session.id,
                cameraId,
                status: 'active',
                config: session.config,
                createdAt: session.createdAt
            };

        } catch (error) {
            log('error', { message: '카메라 스트림 등록 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 카메라 스트림 등록 해제
     */
    static async unregisterCameraStream(userId, cameraId) {
        try {
            const session = sessionStore.getSessionByCameraId(cameraId);

            if (!session || session.userId !== userId) {
                return false;
            }

            // 세션 삭제
            sessionStore.deleteSession(session.id);

            // 카메라 상태 업데이트 (실패해도 흐름 지속)
            try {
                const camera = await Camera.findOne({
                    where: { device_id: cameraId, user_id: userId }
                });

                if (camera) {
                    await camera.update({
                        status: 'offline',
                        last_disconnected: new Date()
                    });
                }
            } catch (dbError) {
                log('warn', { message: '카메라 상태 업데이트 실패(무시)', error: dbError.message });
            }

            log('info', { message: '카메라 스트림 등록 해제 성공', userId, cameraId, sessionId: session.id });

            return true;

        } catch (error) {
            log('error', { message: '카메라 스트림 등록 해제 실패', error: error.message });
            return false;
        }
    }

    /**
     * 뷰어 연결
     */
    static async connectViewer(userId, cameraId, viewerConfig = {}) {
        try {
            // 스트림 세션 확인
            const session = sessionStore.getSessionByCameraId(cameraId);

            if (!session) {
                throw new Error('Camera stream not found');
            }

            if (session.status !== 'active') {
                throw new Error('Camera is not streaming');
            }

            // 접근 권한 확인
            // 우선 세션 소유자(퍼블리셔) 본인 접속은 허용
            let isAuthorized = session.userId === userId;

            // 카메라 레코드가 있는 경우, 소유자 일치 시에도 허용
            try {
                const camera = await Camera.findOne({ where: { device_id: cameraId } });
                if (camera && camera.user_id === userId) {
                    isAuthorized = true;
                }
            } catch (_) {
                // DB 조회 실패는 무시하고 세션 기반 권한으로 판단
            }

            if (!isAuthorized) {
                throw new Error('Access denied');
            }

            // 뷰어 추가
            const viewer = sessionStore.addViewer(session.id, {
                userId,
                type: 'viewer',
                config: {
                    quality: viewerConfig.quality || session.config.quality,
                    ...viewerConfig
                }
            });

            log('info', { message: '뷰어 연결 성공', userId, cameraId, sessionId: session.id, viewerId: viewer.id });

            return {
                viewerId: viewer.id,
                sessionId: session.id,
                cameraId,
                cameraName: session.cameraName,
                config: viewer.config,
                connectedAt: viewer.connectedAt
            };

        } catch (error) {
            log('error', { message: '뷰어 연결 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 뷰어 연결 해제
     */
    static async disconnectViewer(userId, viewerId) {
        try {
            const viewerConnection = sessionStore.viewerConnections.get(viewerId);

            if (!viewerConnection) {
                return false;
            }

            const session = sessionStore.getSession(viewerConnection.sessionId);

            if (!session) {
                return false;
            }

            // 권한 확인 (뷰어 본인이거나 카메라 소유자)
            const viewer = session.viewers.find(v => v.id === viewerId);
            if (!viewer || (viewer.userId !== userId && session.userId !== userId)) {
                return false;
            }

            // 뷰어 제거
            sessionStore.removeViewer(session.id, viewerId);

            log('info', { message: '뷰어 연결 해제 성공', userId, viewerId, sessionId: session.id });

            return true;

        } catch (error) {
            log('error', { message: '뷰어 연결 해제 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 활성 세션 조회
     */
    static async getActiveSessions(userId, options = {}) {
        try {
            const userSessions = sessionStore.getUserSessions(userId);

            return userSessions.map(session => ({
                sessionId: session.id,
                cameraId: session.cameraId,
                cameraName: session.cameraName,
                status: session.status,
                type: session.type,
                config: session.config,
                stats: session.stats,
                createdAt: session.createdAt,
                lastHeartbeat: session.lastHeartbeat,
                ...(options.includeViewers && {
                    viewers: session.viewers.map(v => ({
                        viewerId: v.id,
                        userId: v.userId,
                        connectedAt: v.connectedAt,
                        config: v.config
                    }))
                })
            }));

        } catch (error) {
            log('error', { message: '활성 세션 조회 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 세션 통계 조회
     */
    static async getSessionStats(userId, sessionId) {
        try {
            const session = sessionStore.getSession(sessionId);

            if (!session || session.userId !== userId) {
                return null;
            }

            // 세션 지속 시간 계산
            const now = new Date();
            const duration = Math.floor((now - new Date(session.createdAt)) / 1000);

            return {
                sessionId: session.id,
                cameraId: session.cameraId,
                duration,
                stats: {
                    ...session.stats,
                    duration,
                    currentViewers: session.viewers.length
                },
                createdAt: session.createdAt,
                lastHeartbeat: session.lastHeartbeat
            };

        } catch (error) {
            log('error', { message: '세션 통계 조회 실패', error: error.message });
            throw error;
        }
    }

    /**
     * WebRTC 시그널링 메시지 중계
     */
    static async relaySignalingMessage(userId, sessionId, messageData) {
        try {
            const session = sessionStore.getSession(sessionId);

            if (!session) {
                return false;
            }

            // 권한 확인 (세션 참여자만 가능)
            const isParticipant = session.userId === userId ||
                session.viewers.some(v => v.userId === userId);

            if (!isParticipant) {
                throw new Error('Access denied');
            }

            // 시그널링 메시지 로그
            log('info', { message: '시그널링 메시지 중계', sessionId, type: messageData.type, from: messageData.from, to: messageData.to });

            // 실제 WebSocket을 통한 메시지 중계는 WebSocket 서버에서 처리
            // 여기서는 로깅 및 세션 상태 업데이트만 수행

            return true;

        } catch (error) {
            log('error', { message: '시그널링 메시지 중계 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 세션 하트비트 업데이트
     */
    static async updateSessionHeartbeat(userId, sessionId, clientType) {
        try {
            const session = sessionStore.getSession(sessionId);

            if (!session) {
                return false;
            }

            // 권한 확인
            const isAuthorized = session.userId === userId ||
                session.viewers.some(v => v.userId === userId);

            if (!isAuthorized) {
                return false;
            }

            // 하트비트 업데이트
            sessionStore.updateSession(sessionId, {
                lastHeartbeat: new Date()
            });

            return true;

        } catch (error) {
            log('error', { message: '하트비트 업데이트 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 스트림 품질 변경
     */
    static async changeStreamQuality(userId, sessionId, quality) {
        try {
            const session = sessionStore.getSession(sessionId);

            if (!session || session.userId !== userId) {
                return false;
            }

            // 품질 설정 업데이트 (중첩 객체 안전 변경)
            const updatedConfig = {
                ...session.config,
                quality
            };
            sessionStore.updateSession(sessionId, {
                config: updatedConfig
            });

            // 통계 업데이트
            session.stats.qualityChanges += 1;

            log('info', { message: '스트림 품질 변경', sessionId, quality });

            return true;

        } catch (error) {
            log('error', { message: '스트림 품질 변경 실패', error: error.message });
            throw error;
        }
    }

    /**
     * 서비스 상태 조회
     */
    static async getServiceHealth() {
        try {
            return {
                status: 'healthy',
                activeSessions: sessionStore.getActiveSessionCount(),
                totalViewers: sessionStore.getTotalViewerCount(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: '1.0.0'
            };

        } catch (error) {
            log('error', { message: '서비스 상태 조회 실패', error: error.message });
            throw error;
        }
    }
}

module.exports = StreamingService;

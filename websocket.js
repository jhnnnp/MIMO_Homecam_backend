/**
 * WebSocket 서버 설정
 * 설명: 실시간 통신을 위한 WebSocket 서버 구현
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('./models');
const connectionManager = require('./utils/connectionManager');
const { buildLiveStreamUrl, buildCameraStreamUrl } = require('./utils/mediaUrlBuilder');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // userId -> WebSocket
        this.subscriptions = new Map(); // cameraId -> Set<userId>
        this.userSubscriptions = new Map(); // userId -> Set<cameraId>
        // 카메라 소유자 및 뷰어 추적
        this.cameraOwners = new Map(); // cameraId -> ownerUserId
        this.cameraViewers = new Map(); // cameraId -> Set<viewerUserId>
        this.setupWebSocket();
    }

    /**
     * WebSocket 서버 설정
     */
    setupWebSocket() {
        this.wss.on('connection', async (ws, req) => {
            try {
                // 토큰 검증
                const token = this.extractToken(req);
                if (!token) {
                    ws.close(1008, 'Authentication required');
                    return;
                }

                // 개발용 토큰 허용
                if (token === 'dev_token_123' && process.env.NODE_ENV !== 'production') {
                    console.log('🔧 개발용 토큰으로 WebSocket 연결 허용');
                    const mockUser = { id: 'dev_user', email: 'dev@mimo.com' };
                    this.clients.set(mockUser.id, ws);
                    console.log(`WebSocket client connected: ${mockUser.email} (${mockUser.id})`);

                    this.sendToUser(mockUser.id, {
                        type: 'connected',
                        data: { message: 'WebSocket connected successfully (dev mode)' }
                    });

                    this.setupClientEventHandlers(ws, mockUser);
                    return;
                }

                const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
                const user = await User.findByPk(decoded.userId);

                if (!user) {
                    ws.close(1008, 'User not found');
                    return;
                }

                // 클라이언트 등록
                this.clients.set(user.id, ws);
                console.log(`WebSocket client connected: ${user.email} (${user.id})`);

                // 연결 확인 메시지 전송
                this.sendToUser(user.id, {
                    type: 'connected',
                    data: { message: 'WebSocket connected successfully' }
                });

                // 이벤트 핸들러 설정
                this.setupClientEventHandlers(ws, user);

            } catch (error) {
                console.error('WebSocket authentication error:', error);
                ws.close(1008, 'Authentication failed');
            }
        });
    }

    /**
     * URL에서 토큰 추출
     */
    extractToken(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        return url.searchParams.get('token');
    }

    /**
     * 클라이언트 이벤트 핸들러 설정
     */
    setupClientEventHandlers(ws, user) {
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                await this.handleClientMessage(user, message);
            } catch (error) {
                console.error('Failed to parse client message:', error);
                this.sendToUser(user.id, {
                    type: 'error',
                    data: { message: 'Invalid message format' }
                });
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`WebSocket client disconnected: ${user.email} (${user.id}) - ${code}: ${reason}`);
            this.clients.delete(user.id);
            this.cleanupUserSubscriptions(user.id);
            // 뷰어 연결 정리 및 카메라 소유자에게 알림
            try {
                // 모든 카메라에서 해당 뷰어 제거
                for (const [cameraId, viewers] of this.cameraViewers.entries()) {
                    if (viewers.has(user.id)) {
                        viewers.delete(user.id);
                        // 소유자에게 뷰어 퇴장 알림
                        const ownerId = this.cameraOwners.get(cameraId);
                        if (ownerId) {
                            this.sendToUser(ownerId, {
                                type: 'viewer_left',
                                data: { cameraId, viewerId: user.id }
                            });
                            // 뷰어 수 업데이트도 같이 전송
                            this.sendToUser(ownerId, {
                                type: 'viewer_count_update',
                                data: { connectionId: cameraId, viewerCount: viewers.size }
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('Viewer cleanup on close failed:', e);
            }
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for user ${user.id}:`, error);
            this.clients.delete(user.id);
            this.cleanupUserSubscriptions(user.id);
        });
    }

    /**
     * 클라이언트 메시지 처리
     */
    async handleClientMessage(user, message) {
        const { type, data } = message;

        switch (type) {
            case 'ping':
            case 'heartbeat':
                this.sendToUser(user.id, { type: 'pong', data: { timestamp: new Date().toISOString() } });
                break;

            case 'subscribe_camera':
                // 카메라 구독 로직
                this.handleCameraSubscription(user.id, data);
                break;

            case 'qr_connect':
                // QR 코드 연결 로직
                await this.handleQRConnection(user.id, data);
                break;

            case 'qr_disconnect':
                // QR 코드 연결 해제 로직
                await this.handleQRDisconnection(user.id, data);
                break;

            case 'unsubscribe_camera':
                // 카메라 구독 해제 로직
                this.handleCameraUnsubscription(user.id, data);
                break;

            // 스트리밍 관련 메시지 타입 추가
            case 'webrtc_signaling':
                // WebRTC 시그널링 메시지 처리
                this.handleWebRTCSignaling(user.id, data);
                break;

            case 'register_camera':
                // 카메라 등록
                this.handleCameraRegistration(user.id, data);
                break;

            case 'unregister_camera':
                // 카메라 등록 해제
                this.handleCameraUnregistration(user.id, data);
                break;

            case 'start_stream':
                // 스트림 시작
                this.handleStreamStart(user.id, data);
                break;

            case 'stop_stream':
                // 스트림 중지
                this.handleStreamStop(user.id, data);
                break;

            case 'join_stream':
                // 스트림 참여
                this.handleStreamJoin(user.id, data);
                break;

            case 'leave_stream':
                // 스트림 떠나기
                this.handleStreamLeave(user.id, data);
                break;

            default:
                console.log(`⚠️ [WebSocket] 처리되지 않은 메시지 타입 - 사용자: ${user.id}, 타입: ${type}`);
                // 에러 응답 대신 경고 로그만 출력 (개발 중이므로)
                console.warn('Unhandled message type:', { userId: user.id, type, data });
        }
    }

    /**
     * QR 코드 기반 뷰어 연결 처리
     * @param {string} userId - 뷰어 사용자 ID
     * @param {{ connectionId: string, deviceId?: string }} data
     */
    async handleQRConnection(userId, data) {
        try {
            const { connectionId, deviceId } = data || {};
            if (!connectionId) {
                this.sendToUser(userId, { type: 'error', data: { code: 'E_MISSING_CONNECTION_ID', message: 'connectionId is required' } });
                return;
            }

            // Redis에서 카메라 정보 조회
            const cameraData = await connectionManager.getCamera(connectionId);
            if (!cameraData) {
                this.sendToUser(userId, { type: 'error', data: { code: 'E_CAMERA_NOT_FOUND', message: 'Camera not found or connection expired' } });
                return;
            }

            // 뷰어 연결 등록
            const viewerConnection = {
                cameraId: cameraData.id || cameraData.cameraId,
                cameraName: cameraData.name || cameraData.cameraName,
                connectionId,
                viewerId: userId,
                deviceId: deviceId || null,
                status: 'connected'
            };

            await connectionManager.registerViewerConnection(connectionId, userId, viewerConnection);

            // 미디어 서버 URL 생성
            const cameraId = viewerConnection.cameraId;
            const viewerUrl = buildLiveStreamUrl(String(cameraId), String(userId));
            const cameraUrl = buildCameraStreamUrl(String(cameraId));

            // 뷰어에게 연결 정보 전달
            this.sendToUser(userId, {
                type: 'qr_connected',
                data: {
                    connectionId,
                    cameraId,
                    cameraName: viewerConnection.cameraName,
                    viewerId: userId,
                    media: {
                        viewerUrl,
                        cameraUrl
                    }
                }
            });

            // 카메라 소유자에게 뷰어 연결 알림 (카메라 사용자 연결 시)
            if (cameraData.userId) {
                this.sendToUser(cameraData.userId, {
                    type: 'viewer_connected',
                    data: {
                        cameraId,
                        connectionId,
                        viewerId: userId
                    }
                });
            }
        } catch (error) {
            console.error('handleQRConnection error:', error);
            this.sendToUser(userId, { type: 'error', data: { code: 'E_QR_CONNECT_FAILED', message: 'Failed to connect using QR code' } });
        }
    }

    /**
     * QR 코드 기반 뷰어 연결 해제
     * @param {string} userId - 뷰어 사용자 ID
     * @param {{ connectionId: string }} data
     */
    async handleQRDisconnection(userId, data) {
        try {
            const { connectionId } = data || {};
            if (!connectionId) {
                this.sendToUser(userId, { type: 'error', data: { code: 'E_MISSING_CONNECTION_ID', message: 'connectionId is required' } });
                return;
            }

            const existing = await connectionManager.getViewerConnection(connectionId, userId);
            if (!existing) {
                this.sendToUser(userId, { type: 'qr_disconnected', data: { connectionId, message: 'Already disconnected' } });
                return;
            }

            await connectionManager.unregisterViewerConnection(connectionId, userId);

            this.sendToUser(userId, { type: 'qr_disconnected', data: { connectionId } });

            // 카메라 소유자에게 해제 알림
            const cameraData = await connectionManager.getCamera(connectionId);
            if (cameraData && cameraData.userId) {
                this.sendToUser(cameraData.userId, {
                    type: 'viewer_disconnected',
                    data: { connectionId, cameraId: existing.cameraId, viewerId: userId }
                });
            }
        } catch (error) {
            console.error('handleQRDisconnection error:', error);
            this.sendToUser(userId, { type: 'error', data: { code: 'E_QR_DISCONNECT_FAILED', message: 'Failed to disconnect' } });
        }
    }

    /**
     * 카메라 구독 처리 (상태/이벤트 알림용)
     */
    handleCameraSubscription(userId, data) {
        const { cameraId } = data || {};
        if (!cameraId) {
            this.sendToUser(userId, { type: 'error', data: { code: 'E_MISSING_CAMERA_ID', message: 'cameraId is required' } });
            return;
        }

        // camera -> users
        const users = this.subscriptions.get(cameraId) || new Set();
        users.add(userId);
        this.subscriptions.set(cameraId, users);

        // user -> cameras
        const cameras = this.userSubscriptions.get(userId) || new Set();
        cameras.add(cameraId);
        this.userSubscriptions.set(userId, cameras);

        this.sendToUser(userId, {
            type: 'camera_subscribed',
            data: { cameraId }
        });
    }

    /**
     * 카메라 구독 해제 처리
     */
    handleCameraUnsubscription(userId, data) {
        const { cameraId } = data || {};
        if (!cameraId) {
            this.sendToUser(userId, { type: 'error', data: { code: 'E_MISSING_CAMERA_ID', message: 'cameraId is required' } });
            return;
        }

        // camera -> users
        const users = this.subscriptions.get(cameraId);
        if (users) {
            users.delete(userId);
            if (users.size === 0) this.subscriptions.delete(cameraId);
        }

        // user -> cameras
        const cameras = this.userSubscriptions.get(userId);
        if (cameras) {
            cameras.delete(cameraId);
            if (cameras.size === 0) this.userSubscriptions.delete(userId);
        }

        this.sendToUser(userId, {
            type: 'camera_unsubscribed',
            data: { cameraId }
        });
    }

    /**
     * 사용자 종료 시 구독 정리
     */
    cleanupUserSubscriptions(userId) {
        const cameras = this.userSubscriptions.get(userId);
        if (!cameras) return;
        cameras.forEach((cameraId) => {
            const users = this.subscriptions.get(cameraId);
            if (users) {
                users.delete(userId);
                if (users.size === 0) this.subscriptions.delete(cameraId);
            }
        });
        this.userSubscriptions.delete(userId);
    }

    /**
     * 특정 사용자에게 메시지 전송
     */
    sendToUser(userId, message) {
        const ws = this.clients.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({
                    ...message,
                    timestamp: new Date().toISOString()
                }));
            } catch (error) {
                console.error(`Failed to send message to user ${userId}:`, error);
                this.clients.delete(userId);
            }
        }
    }

    /**
     * 모든 사용자에게 메시지 전송
     */
    broadcast(message, filter = null) {
        this.clients.forEach((ws, userId) => {
            if (filter && !filter(userId)) return;

            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({
                        ...message,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    console.error(`Failed to broadcast message to user ${userId}:`, error);
                    this.clients.delete(userId);
                }
            }
        });
    }

    /**
     * 카메라 상태 업데이트 브로드캐스트
     */
    broadcastCameraStatusUpdate(cameraId, status, userIds = null) {
        const message = {
            type: 'camera_status_update',
            data: {
                cameraId,
                status,
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            const subscribers = this.subscriptions.get(cameraId);
            if (subscribers && subscribers.size > 0) {
                subscribers.forEach(userId => this.sendToUser(userId, message));
            } else {
                this.broadcast(message);
            }
        }
    }

    /**
     * 모션 이벤트 브로드캐스트
     */
    broadcastMotionEvent(eventData, userIds = null) {
        const message = {
            type: 'motion_event',
            data: {
                ...eventData,
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * 녹화 이벤트 브로드캐스트
     */
    broadcastRecordingEvent(eventData, userIds = null) {
        const message = {
            type: 'recording_event',
            data: {
                ...eventData,
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * 시스템 알림 브로드캐스트
     */
    broadcastSystemNotification(notification, userIds = null) {
        const message = {
            type: 'system_notification',
            data: notification
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * 연결된 클라이언트 수 반환
     */
    getConnectedClientsCount() {
        return this.clients.size;
    }

    /**
     * 연결된 사용자 목록 반환
     */
    getConnectedUsers() {
        return Array.from(this.clients.keys());
    }

    /**
     * 특정 사용자가 연결되어 있는지 확인
     */
    isUserConnected(userId) {
        const ws = this.clients.get(userId);
        return ws && ws.readyState === WebSocket.OPEN;
    }

    /**
     * 연결 상태 업데이트 브로드캐스트 (PIN/QR 통합)
     */
    broadcastConnectionStatusUpdate(connectionId, connectionType, status, userIds = null) {
        const message = {
            type: 'connection_status_update',
            data: {
                connectionId,
                connectionType, // 'pin' 또는 'qr'
                status, // 'active', 'expired', 'refreshed'
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * 연결 갱신 알림 브로드캐스트
     */
    broadcastConnectionRefresh(oldConnectionId, newConnectionId, connectionType, userIds = null) {
        const message = {
            type: 'connection_refreshed',
            data: {
                oldConnectionId,
                newConnectionId,
                connectionType,
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * 뷰어 카운트 업데이트 브로드캐스트
     */
    broadcastViewerCountUpdate(connectionId, viewerCount, userIds = null) {
        const message = {
            type: 'viewer_count_update',
            data: {
                connectionId,
                viewerCount,
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * 연결 만료 경고 브로드캐스트
     */
    broadcastConnectionExpirationWarning(connectionId, connectionType, timeLeft, userIds = null) {
        const message = {
            type: 'connection_expiration_warning',
            data: {
                connectionId,
                connectionType,
                timeLeft, // 남은 시간 (초)
                timestamp: new Date().toISOString()
            }
        };

        if (userIds) {
            userIds.forEach(userId => this.sendToUser(userId, message));
        } else {
            this.broadcast(message);
        }
    }

    /**
     * WebRTC 시그널링 메시지 처리
     */
    handleWebRTCSignaling(userId, data) {
        console.log(`📡 [WebRTC] 시그널링 메시지 처리 - 사용자: ${userId}`);
        // WebRTC 시그널링 로직 구현 필요
        // 현재는 로그만 출력
    }

    /**
     * 카메라 등록 처리
     */
    handleCameraRegistration(userId, data) {
        console.log(`📹 [Camera] 카메라 등록 - 사용자: ${userId}, 데이터:`, data);
        // 카메라 소유자 매핑 및 뷰어 세트 초기화
        try {
            const cameraId = data && (data.id || data.cameraId);
            if (cameraId) {
                this.cameraOwners.set(String(cameraId), userId);
                if (!this.cameraViewers.has(String(cameraId))) {
                    this.cameraViewers.set(String(cameraId), new Set());
                }
                // 소유자에게 카메라 연결 알림
                this.sendToUser(userId, {
                    type: 'camera_connected',
                    data: { cameraId: String(cameraId) }
                });
            }
        } catch (e) {
            console.warn('Failed to map camera owner:', e);
        }
        this.sendToUser(userId, {
            type: 'camera_registered',
            data: { success: true, cameraId: data.id }
        });
    }

    /**
     * 카메라 등록 해제 처리
     */
    handleCameraUnregistration(userId, data) {
        console.log(`📹 [Camera] 카메라 등록 해제 - 사용자: ${userId}, 데이터:`, data);
        // 카메라 등록 해제 로직 구현 필요
        this.sendToUser(userId, {
            type: 'camera_unregistered',
            data: { success: true, cameraId: data.id }
        });
    }

    /**
     * 스트림 시작 처리
     */
    handleStreamStart(userId, data) {
        console.log(`🎥 [Stream] 스트림 시작 - 사용자: ${userId}, 데이터:`, data);
        // 스트림 시작 로직 구현 필요
        this.sendToUser(userId, {
            type: 'stream_started',
            data: { success: true, cameraId: data.cameraId }
        });
    }

    /**
     * 스트림 중지 처리
     */
    handleStreamStop(userId, data) {
        console.log(`🛑 [Stream] 스트림 중지 - 사용자: ${userId}, 데이터:`, data);
        // 스트림 중지 로직 구현 필요
        this.sendToUser(userId, {
            type: 'stream_stopped',
            data: { success: true, cameraId: data.cameraId }
        });
    }

    /**
     * 스트림 참여 처리
     */
    handleStreamJoin(userId, data) {
        console.log(`👥 [Stream] 스트림 참여 - 사용자: ${userId}, 데이터:`, data);
        try {
            const cameraId = data && String(data.cameraId);
            const viewerId = data && String(data.viewerId || userId);

            if (!cameraId) {
                this.sendToUser(userId, { type: 'error', data: { message: 'cameraId is required' } });
                return;
            }

            // 뷰어 세트에 추가
            if (!this.cameraViewers.has(cameraId)) {
                this.cameraViewers.set(cameraId, new Set());
            }
            const viewers = this.cameraViewers.get(cameraId);
            viewers.add(viewerId);

            // 뷰어에게 참여 확인
            this.sendToUser(userId, {
                type: 'stream_joined',
                data: { success: true, cameraId, viewerId }
            });

            // 카메라 소유자에게 뷰어 참여 알림
            const ownerId = this.cameraOwners.get(cameraId);
            if (ownerId) {
                this.sendToUser(ownerId, {
                    type: 'viewer_joined',
                    data: { streamId: cameraId, cameraId, viewerId }
                });
                // 뷰어 수 업데이트도 전송
                this.sendToUser(ownerId, {
                    type: 'viewer_count_update',
                    data: { connectionId: cameraId, viewerCount: viewers.size }
                });
            }
        } catch (e) {
            console.error('handleStreamJoin error:', e);
        }
    }

    /**
     * 스트림 떠나기 처리
     */
    handleStreamLeave(userId, data) {
        console.log(`🚪 [Stream] 스트림 떠나기 - 사용자: ${userId}, 데이터:`, data);
        try {
            const cameraId = data && String(data.cameraId);
            const viewerId = data && String(data.viewerId || userId);

            if (cameraId && this.cameraViewers.has(cameraId)) {
                const viewers = this.cameraViewers.get(cameraId);
                viewers.delete(viewerId);

                // 소유자에게 뷰어 퇴장 알림 및 카운트 업데이트
                const ownerId = this.cameraOwners.get(cameraId);
                if (ownerId) {
                    this.sendToUser(ownerId, {
                        type: 'viewer_left',
                        data: { cameraId, viewerId }
                    });
                    this.sendToUser(ownerId, {
                        type: 'viewer_count_update',
                        data: { connectionId: cameraId, viewerCount: viewers.size }
                    });
                }
            }

            // 요청 사용자에게도 확인 응답
            this.sendToUser(userId, {
                type: 'stream_left',
                data: { success: true, cameraId }
            });
        } catch (e) {
            console.error('handleStreamLeave error:', e);
        }
    }
}

module.exports = WebSocketServer; 
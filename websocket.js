/**
 * WebSocket 서버 설정
 * 설명: 실시간 통신을 위한 WebSocket 서버 구현
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // userId -> WebSocket
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
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleClientMessage(user, message);
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
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for user ${user.id}:`, error);
            this.clients.delete(user.id);
        });
    }

    /**
     * 클라이언트 메시지 처리
     */
    handleClientMessage(user, message) {
        const { type, data } = message;

        switch (type) {
            case 'ping':
                this.sendToUser(user.id, { type: 'pong', data: { timestamp: new Date().toISOString() } });
                break;

            case 'subscribe_camera':
                // 카메라 구독 로직
                this.handleCameraSubscription(user.id, data);
                break;

            case 'qr_connect':
                // QR 코드 연결 로직
                this.handleQRConnection(user.id, data);
                break;

            case 'qr_disconnect':
                // QR 코드 연결 해제 로직
                this.handleQRDisconnection(user.id, data);
                break;

            case 'unsubscribe_camera':
                // 카메라 구독 해제 로직
                this.handleCameraUnsubscription(user.id, data);
                break;

            default:
                console.log(`Unknown message type from user ${user.id}:`, type);
                this.sendToUser(user.id, {
                    type: 'error',
                    data: { message: 'Unknown message type' }
                });
        }
    }

    /**
     * 카메라 구독 처리
     */
    handleCameraSubscription(userId, data) {
        const { cameraId } = data;
        // TODO: 카메라 구독 로직 구현
        console.log(`User ${userId} subscribed to camera ${cameraId}`);

        this.sendToUser(userId, {
            type: 'camera_subscribed',
            data: { cameraId, message: 'Successfully subscribed to camera' }
        });
    }

    /**
     * 카메라 구독 해제 처리
     */
    handleCameraUnsubscription(userId, data) {
        const { cameraId } = data;
        // TODO: 카메라 구독 해제 로직 구현
        console.log(`User ${userId} unsubscribed from camera ${cameraId}`);

        this.sendToUser(userId, {
            type: 'camera_unsubscribed',
            data: { cameraId, message: 'Successfully unsubscribed from camera' }
        });
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
            this.broadcast(message);
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
}

module.exports = WebSocketServer; 
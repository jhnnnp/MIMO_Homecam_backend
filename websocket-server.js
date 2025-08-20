const WebSocket = require('ws');
const http = require('http');

class MIMOStreamingServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });

        // 연결된 클라이언트들
        this.clients = new Map(); // clientId -> { type, data, ws }

        // 카메라 정보
        this.cameras = new Map(); // cameraId -> { name, status, viewers }

        // 활성 스트림
        this.activeStreams = new Map(); // streamId -> { cameraId, viewers }

        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('🔗 새로운 클라이언트 연결됨');

            const clientId = this.generateClientId();
            this.clients.set(clientId, { ws, type: null, data: null });

            // 클라이언트에게 ID 전송
            ws.send(JSON.stringify({
                type: 'client_id',
                data: { clientId }
            }));

            ws.on('message', (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    this.handleMessage(clientId, parsedMessage);
                } catch (error) {
                    console.error('메시지 파싱 오류:', error);
                    this.sendError(clientId, '잘못된 메시지 형식입니다.');
                }
            });

            ws.on('close', () => {
                console.log('🔌 클라이언트 연결 종료:', clientId);
                this.handleClientDisconnect(clientId);
            });

            ws.on('error', (error) => {
                console.error('WebSocket 오류:', error);
                this.handleClientDisconnect(clientId);
            });
        });

        this.server.listen(this.port, () => {
            console.log(`🚀 MIMO 스트리밍 서버가 포트 ${this.port}에서 실행 중입니다.`);
        });
    }

    handleMessage(clientId, message) {
        const { type, data } = message;
        console.log(`📨 메시지 수신 [${clientId}]:`, type);

        switch (type) {
            case 'register_camera':
                this.handleRegisterCamera(clientId, data);
                break;
            case 'unregister_camera':
                this.handleUnregisterCamera(clientId, data);
                break;
            case 'start_stream':
                this.handleStartStream(clientId, data);
                break;
            case 'stop_stream':
                this.handleStopStream(clientId, data);
                break;
            case 'join_stream':
                this.handleJoinStream(clientId, data);
                break;
            case 'leave_stream':
                this.handleLeaveStream(clientId, data);
                break;
            case 'webrtc_signaling':
                this.handleWebRTCSignaling(clientId, data);
                break;
            default:
                console.log('알 수 없는 메시지 타입:', type);
        }
    }

    handleRegisterCamera(clientId, data) {
        const { id, name } = data;

        this.cameras.set(id, {
            name,
            status: 'online',
            viewers: [],
            clientId
        });

        this.clients.get(clientId).type = 'camera';
        this.clients.get(clientId).data = { cameraId: id };

        // 모든 클라이언트에게 카메라 연결 알림
        this.broadcast({
            type: 'camera_connected',
            data: { id, name, status: 'online' }
        });

        console.log(`📹 카메라 등록됨: ${name} (${id})`);
    }

    handleUnregisterCamera(clientId, data) {
        const { id } = data;
        const camera = this.cameras.get(id);

        if (camera) {
            this.cameras.delete(id);

            // 모든 클라이언트에게 카메라 연결 해제 알림
            this.broadcast({
                type: 'camera_disconnected',
                data: { id }
            });

            console.log(`📹 카메라 연결 해제됨: ${id}`);
        }
    }

    handleStartStream(clientId, data) {
        const { cameraId } = data;
        const camera = this.cameras.get(cameraId);

        if (!camera) {
            this.sendError(clientId, '카메라를 찾을 수 없습니다.');
            return;
        }

        const streamId = `stream_${cameraId}_${Date.now()}`;
        this.activeStreams.set(streamId, {
            cameraId,
            viewers: [],
            startTime: Date.now()
        });

        camera.status = 'streaming';

        // 스트림 시작 알림
        this.broadcast({
            type: 'stream_started',
            data: {
                id: streamId,
                cameraId,
                status: 'connected',
                timestamp: Date.now()
            }
        });

        console.log(`🎥 스트림 시작됨: ${camera.name} (${streamId})`);
    }

    handleStopStream(clientId, data) {
        const { cameraId } = data;
        const camera = this.cameras.get(cameraId);

        if (camera) {
            camera.status = 'online';

            // 해당 카메라의 모든 스트림 중지
            for (const [streamId, stream] of this.activeStreams.entries()) {
                if (stream.cameraId === cameraId) {
                    this.activeStreams.delete(streamId);

                    this.broadcast({
                        type: 'stream_stopped',
                        data: { streamId }
                    });
                }
            }

            console.log(`🎥 스트림 중지됨: ${camera.name}`);
        }
    }

    handleJoinStream(clientId, data) {
        const { cameraId, viewerId } = data;
        const camera = this.cameras.get(cameraId);

        if (!camera) {
            this.sendError(clientId, '카메라를 찾을 수 없습니다.');
            return;
        }

        // 뷰어를 카메라에 추가
        if (!camera.viewers.includes(viewerId)) {
            camera.viewers.push(viewerId);
        }

        this.clients.get(clientId).type = 'viewer';
        this.clients.get(clientId).data = { viewerId, cameraId };

        // 뷰어 참여 알림
        this.broadcast({
            type: 'viewer_joined',
            data: { cameraId, viewerId }
        });

        console.log(`👁️ 뷰어 참여: ${viewerId} -> ${camera.name}`);
    }

    handleLeaveStream(clientId, data) {
        const { cameraId, viewerId } = data;
        const camera = this.cameras.get(cameraId);

        if (camera) {
            camera.viewers = camera.viewers.filter(id => id !== viewerId);

            // 뷰어 퇴장 알림
            this.broadcast({
                type: 'viewer_left',
                data: { cameraId, viewerId }
            });

            console.log(`👁️ 뷰어 퇴장: ${viewerId} <- ${camera.name}`);
        }
    }

    handleWebRTCSignaling(clientId, data) {
        const { from, to, type, data: signalData } = data;

        // 특정 클라이언트에게 시그널링 메시지 전달
        const targetClient = this.findClientById(to);
        if (targetClient) {
            this.sendToClient(targetClient.id, {
                type: 'webrtc_signaling',
                data: {
                    from,
                    to,
                    type,
                    data: signalData
                }
            });
            console.log(`📡 WebRTC 시그널링: ${from} -> ${to} (${type})`);
        } else {
            console.warn(`⚠️ 대상 클라이언트를 찾을 수 없음: ${to}`);
        }
    }

    findClientById(clientId) {
        return this.clients.get(clientId);
    }

    handleClientDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (client.type === 'camera') {
            const cameraId = client.data?.cameraId;
            if (cameraId) {
                this.handleUnregisterCamera(clientId, { id: cameraId });
            }
        } else if (client.type === 'viewer') {
            const { cameraId, viewerId } = client.data || {};
            if (cameraId && viewerId) {
                this.handleLeaveStream(clientId, { cameraId, viewerId });
            }
        }

        this.clients.delete(clientId);
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    sendError(clientId, errorMessage) {
        this.sendToClient(clientId, {
            type: 'error',
            data: { message: errorMessage }
        });
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getStatus() {
        return {
            connectedClients: this.clients.size,
            cameras: this.cameras.size,
            activeStreams: this.activeStreams.size,
            cameras: Array.from(this.cameras.entries()).map(([id, camera]) => ({
                id,
                name: camera.name,
                status: camera.status,
                viewers: camera.viewers.length
            }))
        };
    }
}

// 서버 시작
const server = new MIMOStreamingServer(8080);

// 상태 모니터링 (선택사항)
setInterval(() => {
    const status = server.getStatus();
    console.log('📊 서버 상태:', status);
}, 30000);

module.exports = MIMOStreamingServer; 
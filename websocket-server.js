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
        this.cameras = new Map(); // cameraId -> { name, status, viewers, clientId }

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
                    // 메시지를 문자열로 변환
                    const messageStr = message.toString();
                    console.log(`📨 원본 메시지 [${clientId}]:`, messageStr);

                    // JSON 파싱 시도
                    let parsedMessage;
                    try {
                        parsedMessage = JSON.parse(messageStr);
                        console.log(`📨 JSON 메시지 수신 [${clientId}]:`, parsedMessage.type);
                        this.handleMessage(clientId, parsedMessage);
                        return;
                    } catch (jsonError) {
                        // JSON이 아닌 경우 텍스트 메시지로 처리
                        console.log(`📨 텍스트 메시지 수신 [${clientId}]:`, messageStr);

                        // 특별한 텍스트 메시지 처리
                        switch (messageStr) {
                            case 'ping':
                                this.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } });
                                break;
                            case 'camera_status':
                                this.sendToClient(clientId, {
                                    type: 'camera_status_response',
                                    data: {
                                        cameras: Array.from(this.cameras.entries()).map(([id, cam]) => ({
                                            id, name: cam.name, status: cam.status
                                        }))
                                    }
                                });
                                break;
                            default:
                                // 에코 응답
                                this.sendToClient(clientId, {
                                    type: 'echo',
                                    data: { message: messageStr, timestamp: Date.now() }
                                });
                        }
                    }
                } catch (error) {
                    console.error('메시지 처리 오류:', error);
                    this.sendError(clientId, '메시지 처리 중 오류가 발생했습니다.');
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

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 MIMO 스트리밍 서버가 포트 ${this.port}에서 실행 중입니다.`);
            console.log(`📱 iOS 연결 URL: ws://192.168.0.9:${this.port}`);
        });
    }

    handleMessage(clientId, message) {
        const { type, data } = message;
        console.log(`📨 메시지 수신 [${clientId}]:`, type);

        switch (type) {
            case 'ping':
            case 'heartbeat':
                this.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } });
                break;
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
            case 'camera_status_update':
                this.handleCameraStatusUpdate(clientId, data);
                break;
            case 'viewer_status_update':
                this.handleViewerStatusUpdate(clientId, data);
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

        // 카메라 등록 확인 응답
        this.sendToClient(clientId, {
            type: 'camera_registered',
            data: { id, name, status: 'online' }
        });
    }

    handleUnregisterCamera(clientId, data) {
        const { id } = data;
        const camera = this.cameras.get(id);

        if (camera) {
            // 연결된 모든 뷰어에게 카메라 연결 해제 알림
            camera.viewers.forEach(viewerId => {
                this.sendToViewer(viewerId, {
                    type: 'camera_disconnected',
                    data: { cameraId: id, reason: 'camera_offline' }
                });
            });

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

        // 스트림 시작 알림 (모든 클라이언트에게)
        this.broadcast({
            type: 'stream_started',
            data: {
                id: streamId,
                cameraId,
                status: 'connected',
                timestamp: Date.now()
            }
        });

        // 카메라에게 스트림 시작 확인 응답
        this.sendToClient(clientId, {
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

                    // 모든 클라이언트에게 스트림 중지 알림
                    this.broadcast({
                        type: 'stream_stopped',
                        data: { streamId, cameraId }
                    });

                    // 연결된 뷰어들에게 스트림 중지 알림
                    stream.viewers.forEach(viewerId => {
                        this.sendToViewer(viewerId, {
                            type: 'stream_stopped',
                            data: { streamId, cameraId, reason: 'camera_stopped' }
                        });
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

        // 뷰어 참여 알림 (모든 클라이언트에게)
        this.broadcast({
            type: 'viewer_joined',
            data: { cameraId, viewerId }
        });

        // 카메라에게 뷰어 참여 알림
        this.sendToCamera(cameraId, {
            type: 'viewer_joined',
            data: { cameraId, viewerId }
        });

        // 뷰어에게 참여 확인 응답
        this.sendToClient(clientId, {
            type: 'stream_joined',
            data: { cameraId, viewerId, cameraName: camera.name }
        });

        console.log(`👁️ 뷰어 참여: ${viewerId} -> ${camera.name}`);
    }

    handleLeaveStream(clientId, data) {
        const { cameraId, viewerId } = data;
        const camera = this.cameras.get(cameraId);

        if (camera) {
            camera.viewers = camera.viewers.filter(id => id !== viewerId);

            // 뷰어 퇴장 알림 (모든 클라이언트에게)
            this.broadcast({
                type: 'viewer_left',
                data: { cameraId, viewerId }
            });

            // 카메라에게 뷰어 퇴장 알림
            this.sendToCamera(cameraId, {
                type: 'viewer_left',
                data: { cameraId, viewerId }
            });

            console.log(`👁️ 뷰어 퇴장: ${viewerId} <- ${camera.name}`);
        }
    }

    handleWebRTCSignaling(clientId, data) {
        const { from, to, type, data: signalData } = data;

        // 우선순위:
        // 1) 내부 clientId 직접 지정
        // 2) cameraId 매핑 (카메라 소켓)
        // 3) viewerId 매핑 (뷰어 소켓)
        let targetClientId = null;

        // 1) 내부 clientId 확인
        const direct = this.findClientById(to);
        if (direct) {
            targetClientId = direct.id;
        }

        // 2) cameraId → clientId 매핑
        if (!targetClientId) {
            const camera = this.cameras.get(to);
            if (camera && camera.clientId) {
                targetClientId = camera.clientId;
            }
        }

        // 3) viewerId → clientId 매핑
        if (!targetClientId) {
            for (const [cid, client] of this.clients.entries()) {
                if (client.type === 'viewer' && client.data?.viewerId === to) {
                    targetClientId = cid;
                    break;
                }
            }
        }

        if (targetClientId) {
            this.sendToClient(targetClientId, {
                type: 'webrtc_signaling',
                data: { from, to, type, data: signalData }
            });
            console.log(`📡 WebRTC 시그널링 전달: ${from} -> ${to} (${type})`);
        } else {
            console.warn(`⚠️ 시그널링 대상 매핑 실패 (to='${to}')`);
        }
    }

    handleCameraStatusUpdate(clientId, data) {
        const { cameraId, status } = data;
        const camera = this.cameras.get(cameraId);

        if (camera) {
            camera.status = status;

            // 모든 클라이언트에게 상태 업데이트 알림
            this.broadcast({
                type: 'camera_status_updated',
                data: { cameraId, status }
            });

            console.log(`📹 카메라 상태 업데이트: ${camera.name} -> ${status}`);
        }
    }

    handleViewerStatusUpdate(clientId, data) {
        const { viewerId, cameraId, status } = data;
        const camera = this.cameras.get(cameraId);

        if (camera) {
            // 카메라에게 뷰어 상태 업데이트 알림
            this.sendToCamera(cameraId, {
                type: 'viewer_status_updated',
                data: { viewerId, status }
            });

            console.log(`👁️ 뷰어 상태 업데이트: ${viewerId} -> ${status}`);
        }
    }

    findClientById(clientId) {
        return this.clients.get(clientId);
    }

    findCameraByClientId(clientId) {
        for (const [cameraId, camera] of this.cameras.entries()) {
            if (camera.clientId === clientId) {
                return { cameraId, ...camera };
            }
        }
        return null;
    }

    findViewerByClientId(clientId) {
        const client = this.clients.get(clientId);
        if (client && client.type === 'viewer') {
            return client.data;
        }
        return null;
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

    sendToCamera(cameraId, message) {
        const camera = this.cameras.get(cameraId);
        if (camera && camera.clientId) {
            this.sendToClient(camera.clientId, message);
        }
    }

    sendToViewer(viewerId, message) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.type === 'viewer' && client.data?.viewerId === viewerId) {
                this.sendToClient(clientId, message);
                break;
            }
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
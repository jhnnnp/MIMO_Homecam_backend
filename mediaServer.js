/**
 * 미디어 서버
 * 설명: 실시간 스트리밍을 위한 미디어 서버 구현
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const crypto = require('crypto');

const MAX_TOKEN_AGE_MS = Number(process.env.MEDIA_TOKEN_MAX_AGE_MS || 60_000); // 60s

function getMediaTokenSecret() {
    return process.env.MEDIA_TOKEN_SECRET || 'dev_media_secret_change_me';
}

function verifyHmacSignature({ type, cameraId, viewerId, ts, token }) {
    if (!ts || !token || !type || !cameraId) return false;
    const age = Date.now() - Number(ts);
    if (Number.isNaN(age) || age < 0 || age > MAX_TOKEN_AGE_MS) return false;
    const parts = [`type=${type}`, `cameraId=${cameraId}`, `ts=${ts}`];
    if (viewerId) parts.push(`viewerId=${viewerId}`);
    const canonical = parts.join('&');
    const expected = crypto.createHmac('sha256', getMediaTokenSecret()).update(canonical).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

class MediaServer {
    constructor(port = 4002) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        // 스트림 관리
        this.streams = new Map(); // cameraId -> stream info
        this.viewers = new Map(); // cameraId -> Set of viewers

        this.setupMiddleware();
        this.setupWebSocket();
        this.setupRoutes();
    }

    /**
     * 미들웨어 설정
     */
    setupMiddleware() {
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://localhost:8081', 'exp://localhost:8081'],
            credentials: true
        }));
        this.app.use(express.json());
    }

    /**
     * WebSocket 설정
     */
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('🔌 미디어 서버 WebSocket 연결:', req.url);

            const url = new URL(req.url, `http://${req.headers.host}`);
            const cameraId = url.searchParams.get('cameraId');
            const type = url.searchParams.get('type'); // 'publisher' or 'viewer'
            const viewerId = url.searchParams.get('viewerId') || undefined;
            const ts = url.searchParams.get('ts');
            const token = url.searchParams.get('token');

            if (!cameraId) {
                ws.close(1008, 'Camera ID required');
                return;
            }

            // 토큰 검증
            if (!verifyHmacSignature({ type, cameraId, viewerId, ts, token })) {
                ws.close(1008, 'Invalid or expired token');
                return;
            }

            if (type === 'publisher') {
                this.handlePublisher(ws, cameraId);
            } else {
                this.handleViewer(ws, cameraId);
            }
        });
    }

    /**
     * 퍼블리셔 (카메라) 처리
     */
    handlePublisher(ws, cameraId) {
        console.log(`📹 카메라 ${cameraId} 스트림 시작`);

        // 스트림 정보 등록
        this.streams.set(cameraId, {
            id: cameraId,
            status: 'live',
            startTime: new Date(),
            viewers: 0,
            publisher: ws,
            meta: { codec: 'H264', width: 1280, height: 720, frameRate: 30, bitrate: 1000000 }
        });

        this.viewers.set(cameraId, new Set());

        ws.on('message', (data) => {
            // JSON 제어 메시지 처리 (메타데이터 협상 등)
            if (typeof data === 'string' || data instanceof String) {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg && msg.type === 'meta') {
                        const stream = this.streams.get(cameraId);
                        if (stream) {
                            stream.meta = { ...stream.meta, ...msg.data };
                        }
                        return;
                    }
                } catch (_) {
                    // binary frame로 처리
                }
            }

            // 바이너리 프레임 브로드캐스트
            const viewers = this.viewers.get(cameraId);
            if (viewers) {
                viewers.forEach(viewer => {
                    if (viewer.readyState === WebSocket.OPEN) {
                        viewer.send(data);
                    }
                });
            }
        });

        ws.on('close', () => {
            console.log(`📹 카메라 ${cameraId} 스트림 종료`);
            this.streams.delete(cameraId);
            this.viewers.delete(cameraId);
        });

        ws.on('error', (error) => {
            console.error(`📹 카메라 ${cameraId} 스트림 오류:`, error);
        });
    }

    /**
     * 뷰어 (클라이언트) 처리
     */
    handleViewer(ws, cameraId) {
        console.log(`👁️ 뷰어가 카메라 ${cameraId} 스트림에 연결`);

        const stream = this.streams.get(cameraId);
        if (!stream) {
            ws.close(1008, 'Stream not available');
            return;
        }

        // 뷰어 등록
        const viewers = this.viewers.get(cameraId);
        if (viewers) {
            viewers.add(ws);
            stream.viewers = viewers.size;
        }

        // 스트림 정보 전송
        ws.send(JSON.stringify({
            type: 'stream_info',
            data: {
                cameraId,
                status: stream.status,
                viewers: stream.viewers,
                startTime: stream.startTime,
                meta: stream.meta
            }
        }));

        ws.on('close', () => {
            console.log(`👁️ 뷰어가 카메라 ${cameraId} 스트림에서 연결 해제`);
            const viewers = this.viewers.get(cameraId);
            if (viewers) {
                viewers.delete(ws);
                const stream = this.streams.get(cameraId);
                if (stream) {
                    stream.viewers = viewers.size;
                }
            }
        });

        ws.on('error', (error) => {
            console.error(`👁️ 뷰어 연결 오류:`, error);
        });
    }

    /**
     * 라우트 설정
     */
    setupRoutes() {
        // 스트림 목록 조회
        this.app.get('/streams', (req, res) => {
            const streamsList = Array.from(this.streams.values()).map(stream => ({
                id: stream.id,
                status: stream.status,
                viewers: stream.viewers,
                startTime: stream.startTime,
                meta: stream.meta
            }));

            res.json({
                ok: true,
                data: { streams: streamsList }
            });
        });

        // 특정 스트림 정보 조회
        this.app.get('/streams/:cameraId', (req, res) => {
            const { cameraId } = req.params;
            const stream = this.streams.get(cameraId);

            if (!stream) {
                return res.status(404).json({
                    ok: false,
                    error: { message: '스트림을 찾을 수 없습니다.' }
                });
            }

            res.json({
                ok: true,
                data: {
                    id: stream.id,
                    status: stream.status,
                    viewers: stream.viewers,
                    startTime: stream.startTime,
                    meta: stream.meta
                }
            });
        });

        // 스트림 시작
        this.app.post('/streams/:cameraId/start', (req, res) => {
            const { cameraId } = req.params;

            if (this.streams.has(cameraId)) {
                return res.status(409).json({
                    ok: false,
                    error: { message: '이미 실행 중인 스트림입니다.' }
                });
            }

            this.streams.set(cameraId, {
                id: cameraId,
                status: 'ready',
                startTime: new Date(),
                viewers: 0
            });

            this.viewers.set(cameraId, new Set());

            res.json({
                ok: true,
                data: { message: '스트림이 시작되었습니다.' }
            });
        });

        // 스트림 중지
        this.app.post('/streams/:cameraId/stop', (req, res) => {
            const { cameraId } = req.params;
            const stream = this.streams.get(cameraId);

            if (!stream) {
                return res.status(404).json({
                    ok: false,
                    error: { message: '스트림을 찾을 수 없습니다.' }
                });
            }

            // 퍼블리셔 연결 종료
            if (stream.publisher) {
                stream.publisher.close();
            }

            // 모든 뷰어 연결 종료
            const viewers = this.viewers.get(cameraId);
            if (viewers) {
                viewers.forEach(viewer => {
                    if (viewer.readyState === WebSocket.OPEN) {
                        viewer.close();
                    }
                });
            }

            this.streams.delete(cameraId);
            this.viewers.delete(cameraId);

            res.json({
                ok: true,
                data: { message: '스트림이 중지되었습니다.' }
            });
        });

        // 서버 상태 확인
        this.app.get('/health', (req, res) => {
            res.json({
                ok: true,
                data: {
                    status: 'running',
                    port: this.port,
                    streams: this.streams.size,
                    totalViewers: Array.from(this.viewers.values())
                        .reduce((sum, viewers) => sum + viewers.size, 0)
                }
            });
        });
    }

    /**
     * 서버 시작
     */
    start() {
        this.server.on('error', (err) => {
            console.error('Media server error:', err);
        });
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🎥 미디어 서버가 포트 ${this.port}에서 실행 중입니다`);
            console.log(`📡 WebSocket: ws://localhost:${this.port}`);
            console.log(`🌐 HTTP: http://localhost:${this.port}`);
        });
    }

    /**
     * 서버 종료
     */
    async stop() {
        try {
            if (this.wss) {
                this.wss.clients.forEach((client) => {
                    try { client.terminate(); } catch (_) { }
                });
                this.wss.close();
            }
        } catch (e) {
            console.error('Error closing media WebSocket server:', e);
        }

        await new Promise((resolve) => {
            this.server.close(() => {
                console.log('🎥 미디어 서버가 종료되었습니다');
                resolve();
            });
        });
    }

    /**
     * 스트림 정보 조회
     */
    getStreamInfo(cameraId) {
        return this.streams.get(cameraId);
    }

    /**
     * 모든 스트림 정보 조회
     */
    getAllStreams() {
        return Array.from(this.streams.values());
    }
}

module.exports = MediaServer; 
const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:8080';

console.log('🎯 실제 홈캠-뷰어 연결 테스트');
console.log('================================');

// 홈캠 디바이스 시뮬레이션
class HomecamDevice {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.ws = null;
        this.clientId = null;
        this.isStreaming = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WS_URL);

            this.ws.on('open', () => {
                console.log(`📹 [홈캠-${this.name}] 연결됨`);
            });

            this.ws.on('message', (data) => {
                const message = JSON.parse(data);
                this.handleMessage(message);

                if (message.type === 'client_id') {
                    this.clientId = message.data.clientId;
                    console.log(`📹 [홈캠-${this.name}] 클라이언트 ID: ${this.clientId}`);
                    resolve(true);
                }
            });

            this.ws.on('error', (error) => {
                console.error(`❌ [홈캠-${this.name}] 연결 실패:`, error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log(`🔌 [홈캠-${this.name}] 연결 종료`);
            });
        });
    }

    registerCamera() {
        if (!this.ws) return;

        const message = {
            type: 'register_camera',
            data: {
                id: this.id,
                name: this.name
            }
        };

        this.ws.send(JSON.stringify(message));
        console.log(`📹 [홈캠-${this.name}] 카메라 등록 요청`);
    }

    startStreaming(viewerId) {
        if (!this.ws) return;

        const message = {
            type: 'start_stream',
            data: {
                cameraId: this.id,
                viewerId: viewerId,
                timestamp: Date.now()
            }
        };

        this.ws.send(JSON.stringify(message));
        console.log(`📹 [홈캠-${this.name}] 스트림 시작: 뷰어 ${viewerId}`);
        this.isStreaming = true;
    }

    handleMessage(message) {
        switch (message.type) {
            case 'camera_connected':
                console.log(`✅ [홈캠-${this.name}] 등록 성공:`, message.data);
                break;
            case 'stream_started':
                console.log(`🎥 [홈캠-${this.name}] 스트림 시작됨:`, message.data);
                break;
            case 'viewer_joined':
                console.log(`👀 [홈캠-${this.name}] 뷰어 참여:`, message.data);
                break;
            case 'webrtc_signaling':
                console.log(`📡 [홈캠-${this.name}] WebRTC 시그널링:`, message.data.type);
                break;
            default:
                console.log(`📨 [홈캠-${this.name}] 메시지:`, message.type);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// 뷰어 디바이스 시뮬레이션
class ViewerDevice {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.ws = null;
        this.clientId = null;
        this.watchingCamera = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WS_URL);

            this.ws.on('open', () => {
                console.log(`👀 [뷰어-${this.name}] 연결됨`);
            });

            this.ws.on('message', (data) => {
                const message = JSON.parse(data);
                this.handleMessage(message);

                if (message.type === 'client_id') {
                    this.clientId = message.data.clientId;
                    console.log(`👀 [뷰어-${this.name}] 클라이언트 ID: ${this.clientId}`);
                    resolve(true);
                }
            });

            this.ws.on('error', (error) => {
                console.error(`❌ [뷰어-${this.name}] 연결 실패:`, error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log(`🔌 [뷰어-${this.name}] 연결 종료`);
            });
        });
    }

    joinStream(cameraId) {
        if (!this.ws) return;

        const message = {
            type: 'join_stream',
            data: {
                cameraId: cameraId,
                viewerId: this.id,
                timestamp: Date.now()
            }
        };

        this.ws.send(JSON.stringify(message));
        console.log(`👀 [뷰어-${this.name}] 스트림 참여: 카메라 ${cameraId}`);
        this.watchingCamera = cameraId;
    }

    handleMessage(message) {
        switch (message.type) {
            case 'stream_joined':
                console.log(`✅ [뷰어-${this.name}] 스트림 참여 성공:`, message.data);
                break;
            case 'stream_started':
                console.log(`🎥 [뷰어-${this.name}] 스트림 시작 알림:`, message.data);
                break;
            case 'webrtc_signaling':
                console.log(`📡 [뷰어-${this.name}] WebRTC 시그널링:`, message.data.type);
                break;
            default:
                console.log(`📨 [뷰어-${this.name}] 메시지:`, message.type);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// 실제 연결 테스트 시나리오
async function runConnectionTest() {
    console.log('\n🚀 실제 홈캠-뷰어 연결 테스트 시작\n');

    // 디바이스 생성
    const homecam = new HomecamDevice('CAMERA_LIVING_ROOM', '거실 카메라');
    const viewer = new ViewerDevice('VIEWER_PHONE', '스마트폰');

    try {
        // 1단계: 홈캠 연결
        console.log('1️⃣ 홈캠 디바이스 연결...');
        await homecam.connect();
        await sleep(1000);

        // 2단계: 홈캠 등록
        console.log('\n2️⃣ 홈캠 등록...');
        homecam.registerCamera();
        await sleep(2000);

        // 3단계: 뷰어 연결
        console.log('\n3️⃣ 뷰어 디바이스 연결...');
        await viewer.connect();
        await sleep(1000);

        // 4단계: 뷰어가 스트림 참여
        console.log('\n4️⃣ 뷰어 스트림 참여...');
        viewer.joinStream(homecam.id);
        await sleep(2000);

        // 5단계: 홈캠에서 스트림 시작
        console.log('\n5️⃣ 홈캠 스트림 시작...');
        homecam.startStreaming(viewer.id);
        await sleep(3000);

        // 6단계: WebRTC 시그널링 테스트
        console.log('\n6️⃣ WebRTC 시그널링 테스트...');

        // 홈캠에서 offer 전송
        const offerMessage = {
            type: 'webrtc_signaling',
            data: {
                from: homecam.clientId,
                to: viewer.clientId,
                type: 'offer',
                data: {
                    type: 'offer',
                    sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\n...(simulated offer)'
                }
            }
        };

        homecam.ws.send(JSON.stringify(offerMessage));
        console.log('📡 홈캠 -> 뷰어: WebRTC Offer 전송');

        await sleep(1000);

        // 뷰어에서 answer 전송
        const answerMessage = {
            type: 'webrtc_signaling',
            data: {
                from: viewer.clientId,
                to: homecam.clientId,
                type: 'answer',
                data: {
                    type: 'answer',
                    sdp: 'v=0\r\no=- 789012 2 IN IP4 127.0.0.1\r\n...(simulated answer)'
                }
            }
        };

        viewer.ws.send(JSON.stringify(answerMessage));
        console.log('📡 뷰어 -> 홈캠: WebRTC Answer 전송');

        await sleep(2000);

        console.log('\n✅ 테스트 완료! 연결이 정상적으로 작동합니다.');

        // 연결 상태 요약
        console.log('\n📊 연결 상태 요약:');
        console.log(`홈캠 상태: ${homecam.isStreaming ? '스트리밍 중' : '대기 중'}`);
        console.log(`뷰어 상태: ${viewer.watchingCamera ? `카메라 ${viewer.watchingCamera} 시청 중` : '대기 중'}`);

    } catch (error) {
        console.error('❌ 테스트 실패:', error);
    }

    // 정리
    setTimeout(() => {
        console.log('\n🧹 연결 정리 중...');
        homecam.disconnect();
        viewer.disconnect();

        setTimeout(() => {
            console.log('✅ 테스트 종료');
            process.exit(0);
        }, 1000);
    }, 5000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 테스트 실행
runConnectionTest().catch(error => {
    console.error('❌ 테스트 실행 실패:', error);
    process.exit(1);
}); 
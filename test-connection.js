/**
 * 백엔드-프론트엔드 연동 테스트 스크립트
 * 설명: API 엔드포인트와 WebSocket 연결을 테스트합니다
 */

const axios = require('axios');
const WebSocket = require('ws');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4001/api';
const WS_URL = process.env.WS_URL || 'ws://localhost:4001/ws';
const MEDIA_SERVER_URL = process.env.MEDIA_SERVER_URL || `http://${process.env.MEDIA_SERVER_HOST || 'localhost'}:${process.env.MEDIA_SERVER_PORT || 4002}`;

// 테스트용 사용자 데이터
const testUser = {
    email: 'test@mimo.com',
    password: 'TestPassword123!',
    displayName: 'Test User'
};

/**
 * API 연결 테스트
 */
async function testApiConnection() {
    console.log('🔍 API 연결 테스트 시작...\n');

    try {
        // 1. 서버 상태 확인
        console.log('1️⃣ 서버 상태 확인...');
        const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/`);
        console.log('✅ 서버 응답:', healthResponse.data);
        console.log('');

        // 2. 회원가입 테스트
        console.log('2️⃣ 회원가입 테스트...');
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
                email: testUser.email,
                password: testUser.password,
                displayName: testUser.displayName,
                accepts: {
                    tosVersion: '1.0',
                    privacyVersion: '1.0',
                    marketing: false
                }
            });
            console.log('✅ 회원가입 성공:', registerResponse.data);
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('ℹ️ 사용자가 이미 존재합니다.');
            } else {
                console.log('❌ 회원가입 실패:', error.response?.data || error.message);
            }
        }
        console.log('');

        // 3. 로그인 테스트
        console.log('3️⃣ 로그인 테스트...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log('✅ 로그인 성공');
        const { accessToken, refreshToken, user } = loginResponse.data.data;
        console.log('👤 사용자:', user.displayName);
        console.log('');

        // 4. 인증된 요청 테스트
        console.log('4️⃣ 인증된 요청 테스트...');
        const profileResponse = await axios.get(`${API_BASE_URL}/profile`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        console.log('✅ 프로필 조회 성공:', profileResponse.data);
        console.log('');

        // 5. 카메라 목록 조회 테스트
        console.log('5️⃣ 카메라 목록 조회 테스트...');
        const camerasResponse = await axios.get(`${API_BASE_URL}/cameras`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        console.log('✅ 카메라 목록 조회 성공:', camerasResponse.data);
        console.log('');

        // 6. 미디어 서버 상태 확인
        console.log('6️⃣ 미디어 서버 상태 확인...');
        try {
            const mediaHealthResponse = await axios.get(`${MEDIA_SERVER_URL}/health`);
            console.log('✅ 미디어 서버 상태:', mediaHealthResponse.data);
        } catch (error) {
            console.log('❌ 미디어 서버 연결 실패:', error.message);
        }
        console.log('');

        console.log('🎉 API 테스트 완료!\n');

        return { accessToken, refreshToken, user };

    } catch (error) {
        console.error('❌ API 테스트 실패:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * WebSocket 연결 테스트
 */
function testWebSocketConnection(accessToken) {
    return new Promise((resolve, reject) => {
        console.log('🔌 WebSocket 연결 테스트 시작...\n');

        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken)}`);

        ws.on('open', () => {
            console.log('✅ WebSocket 연결 성공');

            // 연결 확인 메시지 전송
            ws.send(JSON.stringify({
                type: 'ping',
                data: { message: 'Hello from test client' }
            }));
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 WebSocket 메시지 수신:', message);

                if (message.type === 'pong') {
                    console.log('✅ Ping-Pong 테스트 성공');

                    // 카메라 구독 테스트
                    ws.send(JSON.stringify({
                        type: 'subscribe_camera',
                        data: { cameraId: 'test-camera-1' }
                    }));
                } else if (message.type === 'camera_subscribed') {
                    console.log('✅ 카메라 구독 테스트 성공');

                    // 연결 종료
                    setTimeout(() => {
                        ws.close(1000, 'Test completed');
                    }, 1000);
                }
            } catch (error) {
                console.error('❌ WebSocket 메시지 파싱 실패:', error);
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket 연결 종료: ${code} - ${reason}`);
            console.log('🎉 WebSocket 테스트 완료!\n');
            resolve();
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket 연결 실패:', error);
            reject(error);
        });

        // 타임아웃 설정
        setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.terminate();
                reject(new Error('WebSocket 연결 타임아웃'));
            }
        }, 10000);
    });
}

/**
 * 전체 테스트 실행
 */
async function runAllTests() {
    console.log('🚀 MIMO 백엔드-프론트엔드 연동 테스트 시작\n');
    console.log('='.repeat(50));

    try {
        // API 테스트
        const { accessToken } = await testApiConnection();

        // WebSocket 테스트
        await testWebSocketConnection(accessToken);

        console.log('='.repeat(50));
        console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!');
        console.log('✅ 백엔드와 프론트엔드가 정상적으로 연동되었습니다.');

    } catch (error) {
        console.error('\n❌ 테스트 실패:', error.message);
        process.exit(1);
    }
}

// 스크립트 실행
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testApiConnection,
    testWebSocketConnection,
    runAllTests
}; 
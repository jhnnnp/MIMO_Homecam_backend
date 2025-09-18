/**
 * start-all.js - API 서버와 WebSocket 서버 통합 실행
 * 
 * 기능:
 * - Express API 서버 (포트 4001)
 * - WebSocket 시그널링 서버 (포트 8080)
 * - 프로세스 관리 및 에러 핸들링
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 MIMO 백엔드 서비스 시작...');

// API 서버 시작
const apiServer = spawn('node', ['app.js'], {
    cwd: __dirname,
    stdio: 'pipe',
    env: { ...process.env }
});

// WebSocket 서버 시작
const wsServer = spawn('node', ['websocket-server.js'], {
    cwd: __dirname,
    stdio: 'pipe',
    env: { ...process.env }
});

// API 서버 로그 출력
apiServer.stdout.on('data', (data) => {
    console.log(`[API] ${data.toString().trim()}`);
});

apiServer.stderr.on('data', (data) => {
    console.error(`[API ERROR] ${data.toString().trim()}`);
});

apiServer.on('close', (code) => {
    console.log(`[API] 프로세스 종료됨 (코드: ${code})`);
    if (code !== 0) {
        console.error('[API] 비정상 종료');
        process.exit(1);
    }
});

// WebSocket 서버 로그 출력
wsServer.stdout.on('data', (data) => {
    console.log(`[WS] ${data.toString().trim()}`);
});

wsServer.stderr.on('data', (data) => {
    console.error(`[WS ERROR] ${data.toString().trim()}`);
});

wsServer.on('close', (code) => {
    console.log(`[WS] 프로세스 종료됨 (코드: ${code})`);
    if (code !== 0) {
        console.error('[WS] 비정상 종료');
        process.exit(1);
    }
});

// 종료 신호 처리
process.on('SIGINT', () => {
    console.log('\n📴 서비스 종료 중...');

    apiServer.kill('SIGINT');
    wsServer.kill('SIGINT');

    setTimeout(() => {
        console.log('✅ 모든 서비스가 종료되었습니다.');
        process.exit(0);
    }, 2000);
});

process.on('SIGTERM', () => {
    console.log('\n📴 서비스 종료 중...');

    apiServer.kill('SIGTERM');
    wsServer.kill('SIGTERM');

    setTimeout(() => {
        console.log('✅ 모든 서비스가 종료되었습니다.');
        process.exit(0);
    }, 2000);
});

// 예외 처리
process.on('uncaughtException', (error) => {
    console.error('❌ 처리되지 않은 예외:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 처리되지 않은 Promise 거부:', reason);
    process.exit(1);
});

console.log('✅ 모든 서비스가 시작되었습니다.');
console.log('📡 API 서버: http://localhost:4001');
console.log('🔌 WebSocket 서버: ws://localhost:8080');
console.log('💡 종료하려면 Ctrl+C를 누르세요.');

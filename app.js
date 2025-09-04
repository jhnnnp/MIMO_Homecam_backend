require('dotenv').config();
const express = require('express');
const http = require('http');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const WebSocketServer = require('./websocket');
const MediaServer = require('./mediaServer');
const { sequelize } = require('./models');

// 동적 IP 감지 함수
const getLocalIPAddress = () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // IPv4만 사용
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    // 첫 번째 유효한 IP 반환
    for (const name of Object.keys(results)) {
        for (const ip of results[name]) {
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                return ip;
            }
        }
    }

    return 'localhost'; // 기본값
};

// 서버 시작 시 네트워크 IP 기반 URL 환경변수 보정
const detectedIPForEnv = getLocalIPAddress();
if (!process.env.MEDIA_SERVER_HOST || process.env.MEDIA_SERVER_HOST === 'localhost') {
    process.env.MEDIA_SERVER_HOST = detectedIPForEnv;
}
if (!process.env.WS_SERVER_URL || /localhost/i.test(process.env.WS_SERVER_URL)) {
    process.env.WS_SERVER_URL = `ws://${detectedIPForEnv}:${process.env.PORT || 4001}`;
}

// Sequelize 모델 로드
require('./models');

// 모델 디버깅 코드 추가
const User = require('./models/User');
const TermsAgreement = require('./models/TermsAgreement');

console.log('🔍 [DEBUG] User 모델 속성 확인:');
console.log('User attributes:', Object.keys(User.getAttributes()));
console.log('User rawAttributes:', Object.keys(User.rawAttributes));

console.log('🔍 [DEBUG] TermsAgreement 모델 속성 확인:');
console.log('TermsAgreement attributes:', Object.keys(TermsAgreement.getAttributes()));
console.log('TermsAgreement rawAttributes:', Object.keys(TermsAgreement.rawAttributes));

// DB 연결 테스트
sequelize.authenticate()
    .then(() => {
        console.log('✅ [DEBUG] DB 연결 성공');
        console.log('📊 [DEBUG] DB 정보:', sequelize.config.database);
        console.log('🏠 [DEBUG] DB 호스트:', sequelize.config.host);
    })
    .catch(err => {
        console.error('❌ [DEBUG] DB 연결 실패:', err.message);
    });

// Passport Google Strategy 초기화
require('./service/googleStrategy');

// 전역 에러 핸들링 미들웨어 import
const {
    errorHandler,
    notFoundHandler,
    requestIdMiddleware,
    requestLoggingMiddleware
} = require('./middlewares/errorHandler');

// 보안/운영 미들웨어
app.set('trust proxy', 1);
app.use(helmet());
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS 설정 - 환경별로 구분
const getCorsOrigins = () => {
    // 환경 변수로 설정된 경우
    if (process.env.CORS_ORIGIN) {
        return process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
    }

    // 환경별 기본 설정
    if (process.env.NODE_ENV === 'production') {
        // 프로덕션: 실제 도메인만 허용
        return [
            'https://mimo-camera.com',
            'https://www.mimo-camera.com',
            'https://app.mimo-camera.com',
            // Expo 앱에서의 요청 허용
            /^exp:\/\/.*$/,
            // React Native 앱에서의 요청 허용
            /^react-native:\/\/.*$/
        ];
    } else if (process.env.NODE_ENV === 'staging') {
        // 스테이징: 테스트 도메인 허용
        return [
            'https://staging.mimo-camera.com',
            'https://test.mimo-camera.com',
            /^exp:\/\/.*$/,
            /^react-native:\/\/.*$/
        ];
    } else {
        // 개발 환경: 모든 로컬 접근 허용
        const localIP = getLocalIPAddress();
        console.log('🌐 감지된 로컬 IP:', localIP);

        return [
            'http://localhost:8081',
            'http://localhost:3000',
            'http://localhost:19006', // Expo Web
            `http://${localIP}:8081`,
            `http://${localIP}:3000`,
            'exp://localhost:8081',
            `exp://${localIP}:8081`,
            // 모든 Expo Go 연결 허용
            /^exp:\/\/.*$/,
            // 모든 로컬 네트워크 허용 (개발용)
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/
        ];
    }
};

const corsOrigins = getCorsOrigins();

app.use(cors({
    origin: function (origin, callback) {
        // origin이 없는 경우 (모바일 앱 등) 허용
        if (!origin) return callback(null, true);

        // 정규식 패턴 확인
        const isAllowed = corsOrigins.some(pattern => {
            if (typeof pattern === 'string') {
                return origin === pattern;
            } else if (pattern instanceof RegExp) {
                return pattern.test(origin);
            }
            return false;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            console.log('🚫 CORS 차단된 origin:', origin);
            callback(new Error('CORS 정책에 의해 차단됨'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// 요청 본문 제한
app.use(bodyParser.json({ limit: process.env.BODY_LIMIT || '1mb' }));

// Health Check 엔드포인트 (레이트 리미터 적용 전에 추가)
app.get('/api/health', (req, res) => {
    const currentIP = getLocalIPAddress();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: {
            ip: currentIP,
            port: process.env.PORT || 4001,
            environment: process.env.NODE_ENV || 'development'
        },
        services: {
            database: 'connected', // 실제로는 DB 연결 상태 확인 가능
            websocket: 'running',
            media: 'running'
        }
    });
});

// 레이트 리미터 (/api에만 적용)
const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);

// 라우터 연결 (추후 실제 라우터로 교체)
app.use('/api/auth', require('./routes/authRouter'));
app.use('/api/profile', require('./routes/profileRouter'));
app.use('/api/cameras', require('./routes/cameraRouter'));
app.use('/api/events', require('./routes/eventRouter'));
app.use('/api/recordings', require('./routes/recordingRouter'));
app.use('/api/settings', require('./routes/settingsRouter'));
app.use('/api/notifications', require('./routes/notificationRouter'));
app.use('/api/qr', require('./routes/qrRouter'));


// Google OAuth 콜백을 위한 직접 라우트 추가
app.use('/auth', require('./routes/authRouter'));

// 기본 라우트
app.get('/', (req, res) => {
    res.send('Backend API is running');
});

// 404 에러 핸들러 (라우트를 찾을 수 없는 경우)
app.use(notFoundHandler);

// 전역 에러 핸들러 (모든 에러를 처리)
app.use(errorHandler);

const PORT = process.env.PORT || 4001;
const server = http.createServer(app);

// 서버 에러 핸들링
server.on('error', (error) => {
    console.error('HTTP server error:', error);
});

// WebSocket 서버 초기화
const wss = new WebSocketServer(server);

// WebSocket 서버를 전역으로 설정 (다른 모듈에서 사용할 수 있도록)
global.wss = wss;

// 미디어 서버 시작
const MEDIA_SERVER_PORT = process.env.MEDIA_SERVER_PORT || 4002;
const MEDIA_SERVER_HOST = process.env.MEDIA_SERVER_HOST || 'localhost';
const mediaServer = new MediaServer(parseInt(MEDIA_SERVER_PORT, 10));
mediaServer.start();
global.mediaServer = mediaServer;

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`🌐 http://${localIP}:${PORT}`);
    console.log(`🔌 WebSocket: ws://${localIP}:${PORT}/ws`);
    console.log(`🎥 Media Server: http://${MEDIA_SERVER_HOST}:${MEDIA_SERVER_PORT}`);
    const emailStatus = process.env.NODE_ENV === 'production'
        ? (process.env.SMTP_USER && process.env.SMTP_PASS ? '활성화' : '비활성화(설정 누락)')
        : '개발 모드(콘솔 출력)';
    console.log(`📧 Email 발송: ${emailStatus}`);
    console.log(`👥 Connected clients: ${wss.getConnectedClientsCount()}`);
});

// 그레이스풀 셧다운
function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        console.log('HTTP server closed');

        try {
            if (global.wss && global.wss.wss) {
                global.wss.wss.clients.forEach((client) => {
                    try { client.terminate(); } catch (_) { }
                });
                global.wss.wss.close();
                console.log('WebSocket server closed');
            }

            if (global.mediaServer) {
                await global.mediaServer.stop();
            }

            if (sequelize) {
                await sequelize.close();
                console.log('Database connection closed');
            }
        } catch (e) {
            console.error('Error during shutdown:', e);
        } finally {
            process.exit(0);
        }
    });

    // 강제 종료 타이머
    setTimeout(() => {
        console.warn('Forcing shutdown...');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
}); 
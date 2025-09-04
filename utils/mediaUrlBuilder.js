/**
 * 미디어 서버 URL 빌더
 * 환경변수 기반으로 안전한 미디어 서버 URL 생성
 */

const crypto = require('crypto');

function resolveMediaServerUrl() {
    const explicitUrl = process.env.MEDIA_SERVER_URL;
    if (explicitUrl && explicitUrl.trim()) {
        return explicitUrl;
    }
    const host = process.env.MEDIA_SERVER_HOST || 'localhost';
    const port = process.env.MEDIA_SERVER_PORT || '4002';
    return `ws://${host}:${port}`;
}

function getMediaTokenSecret() {
    const secret = process.env.MEDIA_TOKEN_SECRET || 'dev_media_secret_change_me';
    return secret;
}

function computeHmacSignature(payload) {
    const secret = getMediaTokenSecret();
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function buildCanonicalString({ type, cameraId, viewerId, ts }) {
    const parts = [`type=${type}`, `cameraId=${cameraId}`, `ts=${ts}`];
    if (viewerId) parts.push(`viewerId=${viewerId}`);
    return parts.join('&');
}

function signMediaParams({ type, cameraId, viewerId, ts }) {
    const canonical = buildCanonicalString({ type, cameraId, viewerId, ts });
    const token = computeHmacSignature(canonical);
    return { token, ts };
}

/**
 * 미디어 서버 URL 구성
 * @param {Object} options - URL 구성 옵션
 * @param {string} options.role - 역할 ('viewer' | 'publisher')
 * @param {string} options.cameraId - 카메라 ID
 * @param {string} options.viewerId - 뷰어 ID (viewer 역할일 때)
 * @param {Object} options.params - 추가 쿼리 파라미터
 * @returns {string} 완성된 WebSocket URL
 */
const buildMediaWsUrl = (options) => {
    const {
        role,
        cameraId,
        viewerId,
        params = {}
    } = options;

    // 환경변수에서 미디어 서버 정보 가져오기
    const mediaServerUrl = resolveMediaServerUrl();

    // URL 파싱
    const url = new URL(mediaServerUrl);

    // 기본 쿼리 파라미터 (mediaServer는 'type'을 기대함)
    const type = role; // alias
    const queryParams = {
        type,
        cameraId,
        ...params
    };

    // 뷰어 역할일 때 뷰어 ID 추가
    if (role === 'viewer' && viewerId) {
        queryParams.viewerId = viewerId;
    }

    // 보안 서명 추가 (ts, token)
    const ts = Date.now().toString();
    const { token } = signMediaParams({ type, cameraId, viewerId, ts });
    queryParams.ts = ts;
    queryParams.token = token;

    // 쿼리 파라미터를 URL에 추가
    Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });

    return url.toString();
};

/**
 * 라이브 스트림 URL 생성
 * @param {string} cameraId - 카메라 ID
 * @param {string} viewerId - 뷰어 ID
 * @returns {string} 라이브 스트림 URL
 */
const buildLiveStreamUrl = (cameraId, viewerId) => {
    return buildMediaWsUrl({
        role: 'viewer',
        cameraId,
        viewerId
    });
};

/**
 * 카메라 스트림 URL 생성
 * @param {string} cameraId - 카메라 ID
 * @returns {string} 카메라 스트림 URL
 */
const buildCameraStreamUrl = (cameraId) => {
    return buildMediaWsUrl({
        role: 'publisher',
        cameraId
    });
};

/**
 * 미디어 서버 기본 설정
 * @returns {Object} 기본 설정값
 */
const getDefaultMediaSettings = () => ({
    bitrate: 1000000, // 1Mbps
    frameRate: 30,
    resolution: {
        width: 1280,
        height: 720
    },
    codec: 'H.264',
    audio: {
        enabled: true,
        codec: 'AAC',
        sampleRate: 48000
    }
});

/**
 * 미디어 서버 상태 확인 URL
 * @returns {string} 상태 확인 URL
 */
const buildHealthCheckUrl = () => {
    const mediaServerUrl = resolveMediaServerUrl();
    const url = new URL(mediaServerUrl);

    // HTTP/HTTPS로 변환
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.pathname = '/health';

    return url.toString();
};

module.exports = {
    buildMediaWsUrl,
    buildLiveStreamUrl,
    buildCameraStreamUrl,
    getDefaultMediaSettings,
    buildHealthCheckUrl,
    // internal helpers (useful for server verification)
    signMediaParams,
    buildCanonicalString,
    resolveMediaServerUrl
}; 
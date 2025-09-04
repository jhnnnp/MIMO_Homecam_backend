/**
 * 보안 로깅 유틸리티
 * 민감한 정보 마스킹 및 구조화된 로깅
 */

/**
 * 이메일 주소 마스킹
 * @param {string} email - 원본 이메일
 * @returns {string} 마스킹된 이메일
 */
const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return '***';

    const [local, domain] = email.split('@');
    if (!domain) return '***';

    const maskedLocal = local.length > 2
        ? local.substring(0, 1) + '*'.repeat(local.length - 2) + local.substring(local.length - 1)
        : '***';

    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName.length > 2
        ? domainName.substring(0, 1) + '*'.repeat(domainName.length - 2) + domainName.substring(domainName.length - 1)
        : '***';

    return `${maskedLocal}@${maskedDomain}.${tld || '***'}`;
};

/**
 * 전화번호 마스킹
 * @param {string} phone - 원본 전화번호
 * @returns {string} 마스킹된 전화번호
 */
const maskPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return '***';

    if (phone.length <= 4) return '***';

    return phone.substring(0, phone.length - 4) + '****';
};

/**
 * 토큰/코드 마스킹
 * @param {string} token - 원본 토큰
 * @param {number} visibleChars - 보여줄 문자 수 (기본값: 4)
 * @returns {string} 마스킹된 토큰
 */
const maskToken = (token, visibleChars = 4) => {
    if (!token || typeof token !== 'string') return '***';

    if (token.length <= visibleChars) return '***';

    return token.substring(0, visibleChars) + '...';
};

/**
 * 요청 로그 생성 (민감 정보 마스킹)
 * @param {Object} req - Express request 객체
 * @param {string} endpoint - 엔드포인트 이름
 * @returns {Object} 로그 객체
 */
const createRequestLog = (req, endpoint) => {
    const log = {
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };

    // 쿼리 파라미터 로깅 (민감 정보 제외)
    if (Object.keys(req.query).length > 0) {
        log.query = { ...req.query };
        // 민감한 쿼리 파라미터 마스킹
        if (log.query.email) log.query.email = maskEmail(log.query.email);
        if (log.query.token) log.query.token = maskToken(log.query.token);
    }

    // 요청 본문 로깅 (민감 정보 제외)
    if (req.body && Object.keys(req.body).length > 0) {
        log.body = { ...req.body };
        // 민감한 본문 필드 마스킹
        if (log.body.email) log.body.email = maskEmail(log.body.email);
        if (log.body.password) log.body.password = '***';
        if (log.body.token) log.body.token = maskToken(log.body.token);
        if (log.body.refreshToken) log.body.refreshToken = maskToken(log.body.refreshToken);
        if (log.body.code) log.body.code = maskToken(log.body.code);
    }

    return log;
};

/**
 * 응답 로그 생성
 * @param {Object} res - Express response 객체
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message - 메시지
 * @returns {Object} 로그 객체
 */
const createResponseLog = (res, statusCode, message) => ({
    timestamp: new Date().toISOString(),
    statusCode,
    message,
    success: statusCode >= 200 && statusCode < 300
});

/**
 * 에러 로그 생성
 * @param {Error} error - 에러 객체
 * @param {string} context - 에러 컨텍스트
 * @returns {Object} 로그 객체
 */
const createErrorLog = (error, context) => ({
    timestamp: new Date().toISOString(),
    context,
    error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
});

/**
 * 구조화된 로그 출력
 * @param {string} level - 로그 레벨
 * @param {Object} data - 로그 데이터
 */
const log = (level, data) => {
    const logEntry = {
        level,
        ...data,
        timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(logEntry));
};

module.exports = {
    maskEmail,
    maskPhone,
    maskToken,
    createRequestLog,
    createResponseLog,
    createErrorLog,
    log
}; 
/**
 * 전역 에러 핸들링 미들웨어
 * 모든 컨트롤러의 에러를 일관되게 처리
 */

const { err, errors } = require('../utils/responseHelpers');
const { createErrorLog, log } = require('../utils/logger');

/**
 * 에러 코드 매핑 테이블
 */
const ERROR_CODE_MAP = {
    // Sequelize 에러
    'SequelizeValidationError': 'E_VALIDATION',
    'SequelizeUniqueConstraintError': 'E_CONFLICT',
    'SequelizeForeignKeyConstraintError': 'E_FOREIGN_KEY',
    'SequelizeConnectionError': 'E_DATABASE_ERROR',
    'SequelizeTimeoutError': 'E_DATABASE_ERROR',

    // JWT 에러
    'JsonWebTokenError': 'E_UNAUTHORIZED',
    'TokenExpiredError': 'E_TOKEN_EXPIRED',
    'NotBeforeError': 'E_TOKEN_INVALID',

    // 일반 에러
    'ValidationError': 'E_VALIDATION',
    'NotFoundError': 'E_NOT_FOUND',
    'UnauthorizedError': 'E_UNAUTHORIZED',
    'ForbiddenError': 'E_FORBIDDEN',
    'ConflictError': 'E_CONFLICT',

    // 기본값
    'default': 'E_SERVER_ERROR'
};

/**
 * 에러 메시지 매핑 테이블
 */
const ERROR_MESSAGE_MAP = {
    'E_VALIDATION': '입력 데이터가 올바르지 않습니다.',
    'E_NOT_FOUND': '요청한 리소스를 찾을 수 없습니다.',
    'E_UNAUTHORIZED': '인증이 필요합니다.',
    'E_FORBIDDEN': '접근 권한이 없습니다.',
    'E_CONFLICT': '리소스 충돌이 발생했습니다.',
    'E_TOKEN_EXPIRED': '토큰이 만료되었습니다.',
    'E_TOKEN_INVALID': '유효하지 않은 토큰입니다.',
    'E_FOREIGN_KEY': '관련된 데이터가 존재하지 않습니다.',
    'E_DATABASE_ERROR': '데이터베이스 오류가 발생했습니다.',
    'E_SERVER_ERROR': '서버 오류가 발생했습니다.'
};

/**
 * HTTP 상태 코드 매핑 테이블
 */
const HTTP_STATUS_MAP = {
    'E_VALIDATION': 400,
    'E_NOT_FOUND': 404,
    'E_UNAUTHORIZED': 401,
    'E_FORBIDDEN': 403,
    'E_CONFLICT': 409,
    'E_TOKEN_EXPIRED': 401,
    'E_TOKEN_INVALID': 401,
    'E_FOREIGN_KEY': 400,
    'E_DATABASE_ERROR': 500,
    'E_SERVER_ERROR': 500
};

/**
 * 에러 코드 결정
 * @param {Error} error - 에러 객체
 * @returns {string} 에러 코드
 */
const determineErrorCode = (error) => {
    // 명시적으로 설정된 에러 코드가 있으면 사용
    if (error.code && ERROR_CODE_MAP[error.code]) {
        return error.code;
    }

    // 에러 이름으로 매핑
    if (error.name && ERROR_CODE_MAP[error.name]) {
        return ERROR_CODE_MAP[error.name];
    }

    // 에러 메시지로 특정 패턴 매칭
    if (error.message) {
        const message = error.message.toLowerCase();

        if (message.includes('not found') || message.includes('찾을 수 없습니다')) {
            return 'E_NOT_FOUND';
        }
        if (message.includes('unauthorized') || message.includes('인증')) {
            return 'E_UNAUTHORIZED';
        }
        if (message.includes('forbidden') || message.includes('권한')) {
            return 'E_FORBIDDEN';
        }
        if (message.includes('validation') || message.includes('검증')) {
            return 'E_VALIDATION';
        }
        if (message.includes('duplicate') || message.includes('중복')) {
            return 'E_CONFLICT';
        }
    }

    return ERROR_CODE_MAP.default;
};

/**
 * 에러 메시지 결정
 * @param {Error} error - 에러 객체
 * @param {string} errorCode - 에러 코드
 * @returns {string} 에러 메시지
 */
const determineErrorMessage = (error, errorCode) => {
    // 명시적으로 설정된 메시지가 있으면 사용
    if (error.message && !error.message.includes('Sequelize')) {
        return error.message;
    }

    // 기본 메시지 사용
    return ERROR_MESSAGE_MAP[errorCode] || ERROR_MESSAGE_MAP['E_SERVER_ERROR'];
};

/**
 * 에러 상세 정보 생성
 * @param {Error} error - 에러 객체
 * @param {string} errorCode - 에러 코드
 * @returns {Object} 상세 정보
 */
const createErrorDetails = (error, errorCode) => {
    const details = {};

    // Sequelize 검증 에러 상세 정보
    if (error.name === 'SequelizeValidationError' && error.errors) {
        details.validationErrors = error.errors.map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));
    }

    // Sequelize 중복 제약 에러 상세 정보
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields) {
        details.duplicateFields = Object.keys(error.fields);
    }

    // 개발 환경에서만 스택 트레이스 포함
    if (process.env.NODE_ENV === 'development') {
        details.stack = error.stack;
    }

    return Object.keys(details).length > 0 ? details : null;
};

/**
 * 전역 에러 핸들러 미들웨어
 */
const errorHandler = (error, req, res, next) => {
    // 에러 로그 생성
    const errorLog = createErrorLog(error, `${req.method} ${req.path}`);
    log('error', errorLog);

    // 에러 코드 결정
    const errorCode = determineErrorCode(error);

    // 에러 메시지 결정
    const errorMessage = determineErrorMessage(error, errorCode);

    // HTTP 상태 코드 결정
    const statusCode = HTTP_STATUS_MAP[errorCode] || 500;

    // 에러 상세 정보 생성
    const details = createErrorDetails(error, errorCode);

    // 에러 응답 전송
    err(res, errorCode, errorMessage, statusCode, details);
};

/**
 * 404 에러 핸들러
 */
const notFoundHandler = (req, res) => {
    const errorLog = createErrorLog(
        new Error('Route not found'),
        `${req.method} ${req.path}`
    );
    log('warn', errorLog);

    errors.notFound(res, '요청한 엔드포인트를 찾을 수 없습니다.');
};

/**
 * 요청 ID 생성 미들웨어
 */
const requestIdMiddleware = (req, res, next) => {
    req.requestId = req.headers['x-request-id'] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.setHeader('X-Request-ID', req.requestId);
    next();
};

/**
 * 요청 로깅 미들웨어
 */
const requestLoggingMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // 응답 완료 후 로깅
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        };

        const level = res.statusCode >= 400 ? 'warn' : 'info';
        log(level, logData);
    });

    next();
};

module.exports = {
    errorHandler,
    notFoundHandler,
    requestIdMiddleware,
    requestLoggingMiddleware
}; 
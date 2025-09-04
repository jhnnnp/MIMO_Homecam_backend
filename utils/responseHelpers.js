/**
 * 표준화된 API 응답 헬퍼
 */

/**
 * 성공 응답 생성
 * @param {Object} res - Express response 객체
 * @param {*} data - 응답 데이터
 * @param {Object} meta - 메타데이터 (페이징 등)
 */
const ok = (res, data, meta = null) => {
    const response = { ok: true, data };
    if (meta) response.meta = meta;
    return res.json(response);
};

/**
 * 에러 응답 생성
 * @param {Object} res - Express response 객체
 * @param {string} code - 에러 코드
 * @param {string} message - 에러 메시지
 * @param {number} status - HTTP 상태 코드 (기본값: 400)
 * @param {Object} details - 상세 정보
 */
const err = (res, code, message, status = 400, details = null) => {
    const response = {
        ok: false,
        error: { code, message }
    };
    if (details) response.error.details = details;
    return res.status(status).json(response);
};

/**
 * 일반적인 에러 응답들
 */
const errors = {
    validation: (res, message, details = null) =>
        err(res, 'E_VALIDATION', message, 400, details),

    badRequest: (res, message = '잘못된 요청입니다.') =>
        err(res, 'E_BAD_REQUEST', message, 400),

    notFound: (res, message = '리소스를 찾을 수 없습니다.') =>
        err(res, 'E_NOT_FOUND', message, 404),

    unauthorized: (res, message = '인증이 필요합니다.') =>
        err(res, 'E_UNAUTHORIZED', message, 401),

    forbidden: (res, message = '접근 권한이 없습니다.') =>
        err(res, 'E_FORBIDDEN', message, 403),

    conflict: (res, message = '리소스 충돌이 발생했습니다.') =>
        err(res, 'E_CONFLICT', message, 409),

    serverError: (res, message = '서버 오류가 발생했습니다.') =>
        err(res, 'E_SERVER_ERROR', message, 500),

    databaseError: (res, message = '데이터베이스 오류가 발생했습니다.') =>
        err(res, 'E_DATABASE_ERROR', message, 500)
};

module.exports = {
    ok,
    err,
    errors
}; 
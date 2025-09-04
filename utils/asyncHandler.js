/**
 * 비동기 핸들러 래퍼
 * Express 라우트 핸들러의 try-catch를 자동화
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler; 
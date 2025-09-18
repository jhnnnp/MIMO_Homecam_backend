/**
 * StreamingController - WebRTC 스트리밍 관련 API 컨트롤러
 * 
 * 핵심 기능:
 * - 카메라 스트림 등록/해제
 * - 뷰어 연결 관리
 * - WebRTC 시그널링 지원
 * - 스트림 상태 및 통계 조회
 */

const asyncHandler = require('../utils/asyncHandler');
const { createRequestLog, createResponseLog, log } = require('../utils/logger');
const { ok, errors } = require('../utils/responseHelpers');
const StreamingService = require('../service/StreamingService');

/**
 * [POST] /streaming/camera/register
 * 카메라 스트림 등록
 */
exports.registerCameraStream = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'REGISTER_CAMERA_STREAM');
    log('info', requestLog);

    const { cameraId, streamConfig } = req.body;
    const userId = req.user.userId;

    // 입력 검증
    if (!cameraId) {
        return errors.badRequest(res, 'cameraId는 필수입니다.');
    }

    try {
        const streamSession = await StreamingService.registerCameraStream(userId, cameraId, streamConfig);

        const responseLog = createResponseLog(res, 201, '카메라 스트림 등록 성공');
        log('info', responseLog);

        ok(res, {
            streamSession,
            message: '카메라 스트림이 성공적으로 등록되었습니다.'
        }, null, 201);

    } catch (error) {
        log('error', '카메라 스트림 등록 실패:', error);
        errors.serverError(res, '카메라 스트림 등록 중 오류가 발생했습니다.');
    }
});

/**
 * [DELETE] /streaming/camera/:cameraId/unregister
 * 카메라 스트림 등록 해제
 */
exports.unregisterCameraStream = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'UNREGISTER_CAMERA_STREAM');
    log('info', requestLog);

    const { cameraId } = req.params;
    const userId = req.user.userId;

    try {
        const result = await StreamingService.unregisterCameraStream(userId, cameraId);

        if (!result) {
            return errors.notFound(res, '등록된 카메라 스트림을 찾을 수 없습니다.');
        }

        const responseLog = createResponseLog(res, 200, '카메라 스트림 등록 해제 성공');
        log('info', responseLog);

        ok(res, {
            message: '카메라 스트림 등록이 해제되었습니다.'
        });

    } catch (error) {
        log('error', '카메라 스트림 등록 해제 실패:', error);
        errors.serverError(res, '카메라 스트림 등록 해제 중 오류가 발생했습니다.');
    }
});

/**
 * [POST] /streaming/viewer/connect
 * 뷰어 연결 요청
 */
exports.connectViewer = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'CONNECT_VIEWER');
    log('info', requestLog);

    const { cameraId, viewerConfig } = req.body;
    const userId = req.user.userId;

    // 입력 검증
    if (!cameraId) {
        return errors.badRequest(res, 'cameraId는 필수입니다.');
    }

    try {
        const viewerConnection = await StreamingService.connectViewer(userId, cameraId, viewerConfig);

        const responseLog = createResponseLog(res, 201, '뷰어 연결 성공');
        log('info', responseLog);

        ok(res, {
            viewerConnection,
            message: '뷰어가 성공적으로 연결되었습니다.'
        }, null, 201);

    } catch (error) {
        log('error', '뷰어 연결 실패:', error);

        if (error.message.includes('not found')) {
            return errors.notFound(res, '카메라를 찾을 수 없습니다.');
        }
        if (error.message.includes('not streaming')) {
            return errors.badRequest(res, '카메라가 스트리밍 중이 아닙니다.');
        }

        errors.serverError(res, '뷰어 연결 중 오류가 발생했습니다.');
    }
});

/**
 * [DELETE] /streaming/viewer/:viewerId/disconnect
 * 뷰어 연결 해제
 */
exports.disconnectViewer = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'DISCONNECT_VIEWER');
    log('info', requestLog);

    const { viewerId } = req.params;
    const userId = req.user.userId;

    try {
        const result = await StreamingService.disconnectViewer(userId, viewerId);

        if (!result) {
            return errors.notFound(res, '뷰어 연결을 찾을 수 없습니다.');
        }

        const responseLog = createResponseLog(res, 200, '뷰어 연결 해제 성공');
        log('info', responseLog);

        ok(res, {
            message: '뷰어 연결이 해제되었습니다.'
        });

    } catch (error) {
        log('error', '뷰어 연결 해제 실패:', error);
        errors.serverError(res, '뷰어 연결 해제 중 오류가 발생했습니다.');
    }
});

/**
 * [GET] /streaming/sessions/active
 * 활성 스트림 세션 조회
 */
exports.getActiveSessions = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_ACTIVE_SESSIONS');
    log('info', requestLog);

    const userId = req.user.userId;
    const { includeViewers = false } = req.query;

    try {
        const activeSessions = await StreamingService.getActiveSessions(userId, { includeViewers });

        const responseLog = createResponseLog(res, 200, '활성 세션 조회 성공');
        log('info', responseLog);

        ok(res, {
            sessions: activeSessions,
            count: activeSessions.length
        });

    } catch (error) {
        log('error', '활성 세션 조회 실패:', error);
        errors.serverError(res, '활성 세션 조회 중 오류가 발생했습니다.');
    }
});

/**
 * [GET] /streaming/sessions/:sessionId/stats
 * 스트림 세션 통계 조회
 */
exports.getSessionStats = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_SESSION_STATS');
    log('info', requestLog);

    const { sessionId } = req.params;
    const userId = req.user.userId;

    try {
        const stats = await StreamingService.getSessionStats(userId, sessionId);

        if (!stats) {
            return errors.notFound(res, '세션을 찾을 수 없습니다.');
        }

        const responseLog = createResponseLog(res, 200, '세션 통계 조회 성공');
        log('info', responseLog);

        ok(res, { stats });

    } catch (error) {
        log('error', '세션 통계 조회 실패:', error);
        errors.serverError(res, '세션 통계 조회 중 오류가 발생했습니다.');
    }
});

/**
 * [POST] /streaming/signaling/:sessionId
 * WebRTC 시그널링 메시지 중계
 */
exports.relaySignalingMessage = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'RELAY_SIGNALING_MESSAGE');
    log('info', requestLog);

    const { sessionId } = req.params;
    const { type, data, from, to } = req.body;
    const userId = req.user.userId;

    // 입력 검증
    if (!type || !from || !to) {
        return errors.badRequest(res, 'type, from, to는 필수입니다.');
    }

    try {
        const result = await StreamingService.relaySignalingMessage(userId, sessionId, {
            type,
            data,
            from,
            to
        });

        if (!result) {
            return errors.notFound(res, '세션을 찾을 수 없습니다.');
        }

        const responseLog = createResponseLog(res, 200, '시그널링 메시지 중계 성공');
        log('info', responseLog);

        ok(res, {
            message: '시그널링 메시지가 성공적으로 중계되었습니다.'
        });

    } catch (error) {
        log('error', '시그널링 메시지 중계 실패:', error);
        errors.serverError(res, '시그널링 메시지 중계 중 오류가 발생했습니다.');
    }
});

/**
 * [POST] /streaming/sessions/:sessionId/heartbeat
 * 세션 하트비트 (연결 유지)
 */
exports.sessionHeartbeat = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'SESSION_HEARTBEAT');
    log('info', requestLog);

    const { sessionId } = req.params;
    const { clientType } = req.body; // 'camera' or 'viewer'
    const userId = req.user.userId;

    try {
        const result = await StreamingService.updateSessionHeartbeat(userId, sessionId, clientType);

        if (!result) {
            return errors.notFound(res, '세션을 찾을 수 없습니다.');
        }

        const responseLog = createResponseLog(res, 200, '하트비트 업데이트 성공');
        log('info', responseLog);

        ok(res, {
            message: '하트비트가 업데이트되었습니다.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log('error', '하트비트 업데이트 실패:', error);
        errors.serverError(res, '하트비트 업데이트 중 오류가 발생했습니다.');
    }
});

/**
 * [GET] /streaming/health
 * 스트리밍 서비스 상태 확인
 */
exports.getStreamingHealth = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_STREAMING_HEALTH');
    log('info', requestLog);

    try {
        const health = await StreamingService.getServiceHealth();

        const responseLog = createResponseLog(res, 200, '스트리밍 서비스 상태 조회 성공');
        log('info', responseLog);

        ok(res, {
            ...health,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log('error', '스트리밍 서비스 상태 조회 실패:', error);
        errors.serverError(res, '스트리밍 서비스 상태 조회 중 오류가 발생했습니다.');
    }
});

/**
 * [POST] /streaming/sessions/:sessionId/quality
 * 스트림 품질 변경
 */
exports.changeStreamQuality = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'CHANGE_STREAM_QUALITY');
    log('info', requestLog);

    const { sessionId } = req.params;
    const { quality } = req.body; // '720p', '1080p', '4K'
    const userId = req.user.userId;

    // 입력 검증
    if (!quality || !['720p', '1080p', '4K'].includes(quality)) {
        return errors.badRequest(res, '유효하지 않은 품질 설정입니다.');
    }

    try {
        const result = await StreamingService.changeStreamQuality(userId, sessionId, quality);

        if (!result) {
            return errors.notFound(res, '세션을 찾을 수 없습니다.');
        }

        const responseLog = createResponseLog(res, 200, '스트림 품질 변경 성공');
        log('info', responseLog);

        ok(res, {
            message: `스트림 품질이 ${quality}로 변경되었습니다.`,
            quality
        });

    } catch (error) {
        log('error', '스트림 품질 변경 실패:', error);
        errors.serverError(res, '스트림 품질 변경 중 오류가 발생했습니다.');
    }
});

module.exports = exports;

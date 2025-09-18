// EventController.js
const eventService = require('../service/EventService');

// 유틸리티 import
const { ok, err, errors } = require('../utils/responseHelpers');
const { parsePaging, parseDate } = require('../utils/validationHelpers');
const asyncHandler = require('../utils/asyncHandler');
const { createRequestLog, createResponseLog, log } = require('../utils/logger');

/**
 * [GET] /events
 * 사용자의 이벤트 목록 조회 (필터링 지원)
 */
exports.getEvents = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_EVENTS');
    log('info', requestLog);

    // 페이징 파라미터 파싱 및 검증
    const { limit, offset } = parsePaging(req.query);

    // 필터 파라미터 검증
    const filters = {
        deviceId: req.query.deviceId,
        since: parseDate(req.query.since),
        hasS3: req.query.hasS3 === 'true',
        pinned: req.query.pinned === 'true',
        limit,
        offset
    };

    // 날짜 필터 검증
    if (req.query.since && !filters.since) {
        const responseLog = createResponseLog(res, 400, '잘못된 날짜 형식입니다.');
        log('warn', responseLog);
        return errors.validation(res, '잘못된 날짜 형식입니다. ISO 8601 형식을 사용해주세요.');
    }

    const result = await eventService.getEventsByUserId(req.user.userId, filters);

    const responseLog = createResponseLog(res, 200, '이벤트 목록 조회 성공');
    log('info', responseLog);

    ok(res, {
        events: result.events,
        pagination: result.pagination
    });
});

/**
 * [GET] /events/:id
 * 특정 이벤트 상세 정보 조회
 */
exports.getEventById = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_EVENT_BY_ID');
    log('info', requestLog);

    const { id } = req.params;
    const event = await eventService.getEventById(id, req.user.userId);

    const responseLog = createResponseLog(res, 200, '이벤트 정보 조회 성공');
    log('info', responseLog);

    ok(res, { event });
});

/**
 * [POST] /events
 * 새 이벤트 생성
 */
exports.createEvent = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'CREATE_EVENT');
    log('info', requestLog);

    const eventData = req.body;
    const event = await eventService.createEvent(eventData, req.user.userId);

    const responseLog = createResponseLog(res, 201, '이벤트 생성 성공');
    log('info', responseLog);

    ok(res, {
        event,
        message: '이벤트가 성공적으로 생성되었습니다.'
    }, null, 201);
});

/**
 * [PUT] /events/:id
 * 이벤트 정보 업데이트
 */
exports.updateEvent = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'UPDATE_EVENT');
    log('info', requestLog);

    const { id } = req.params;
    const updateData = req.body;
    const event = await eventService.updateEvent(id, updateData, req.user.userId);

    const responseLog = createResponseLog(res, 200, '이벤트 정보 업데이트 성공');
    log('info', responseLog);

    ok(res, {
        event,
        message: '이벤트 정보가 성공적으로 업데이트되었습니다.'
    });
});

/**
 * [DELETE] /events/:id
 * 이벤트 삭제
 */
exports.deleteEvent = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'DELETE_EVENT');
    log('info', requestLog);

    const { id } = req.params;
    await eventService.deleteEvent(id, req.user.userId);

    const responseLog = createResponseLog(res, 200, '이벤트 삭제 성공');
    log('info', responseLog);

    ok(res, {
        message: '이벤트가 성공적으로 삭제되었습니다.'
    });
});

/**
 * [POST] /events/:id/pin
 * 이벤트 핀 설정/해제
 */
exports.toggleEventPin = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'TOGGLE_EVENT_PIN');
    log('info', requestLog);

    const { id } = req.params;
    const { pinned } = req.body;

    if (typeof pinned !== 'boolean') {
        const responseLog = createResponseLog(res, 400, 'pinned 필드는 boolean 값이어야 합니다.');
        log('warn', responseLog);
        return errors.validation(res, 'pinned 필드는 boolean 값이어야 합니다.');
    }

    const event = await eventService.toggleEventPin(id, pinned, req.user.userId);

    const responseLog = createResponseLog(res, 200, '이벤트 핀 상태 변경 성공');
    log('info', responseLog);

    ok(res, {
        event,
        message: `이벤트가 ${pinned ? '핀 설정' : '핀 해제'}되었습니다.`
    });
});

/**
 * [GET] /events/stats
 * 이벤트 통계 조회
 */
exports.getEventStats = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_EVENT_STATS');
    log('info', requestLog);

    const { since } = req.query;
    const sinceDate = since ? parseDate(since) : null;

    if (since && !sinceDate) {
        const responseLog = createResponseLog(res, 400, '잘못된 날짜 형식입니다.');
        log('warn', responseLog);
        return errors.validation(res, '잘못된 날짜 형식입니다. ISO 8601 형식을 사용해주세요.');
    }

    const stats = await eventService.getEventStats(req.user.userId, sinceDate);

    const responseLog = createResponseLog(res, 200, '이벤트 통계 조회 성공');
    log('info', responseLog);

    ok(res, stats);
});

/**
 * [POST] /events/bulk-action
 * 이벤트 벌크 액션 (삭제, 핀 설정 등)
 */
exports.bulkAction = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'BULK_ACTION');
    log('info', requestLog);

    const { eventIds, action } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        const responseLog = createResponseLog(res, 400, '이벤트 ID 목록이 필요합니다.');
        log('warn', responseLog);
        return errors.validation(res, '이벤트 ID 목록이 필요합니다.');
    }

    if (!action || !['delete', 'pin', 'unpin'].includes(action)) {
        const responseLog = createResponseLog(res, 400, '유효하지 않은 액션입니다.');
        log('warn', responseLog);
        return errors.validation(res, '유효하지 않은 액션입니다. (delete, pin, unpin)');
    }

    const result = await eventService.bulkAction(eventIds, action, req.user.userId);

    const responseLog = createResponseLog(res, 200, '벌크 액션 성공');
    log('info', responseLog);

    ok(res, {
        ...result,
        message: `${result.successCount}개의 이벤트에 대해 ${action} 액션이 수행되었습니다.`
    });
});

/**
 * [GET] /events/search
 * 이벤트 검색
 */
exports.searchEvents = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'SEARCH_EVENTS');
    log('info', requestLog);

    const { q, deviceId, type, since, until } = req.query;
    const { limit, offset } = parsePaging(req.query);

    if (!q || q.trim().length === 0) {
        const responseLog = createResponseLog(res, 400, '검색어가 필요합니다.');
        log('warn', responseLog);
        return errors.validation(res, '검색어가 필요합니다.');
    }

    // 날짜 필터 검증
    const sinceDate = since ? parseDate(since) : null;
    const untilDate = until ? parseDate(until) : null;

    if ((since && !sinceDate) || (until && !untilDate)) {
        const responseLog = createResponseLog(res, 400, '잘못된 날짜 형식입니다.');
        log('warn', responseLog);
        return errors.validation(res, '잘못된 날짜 형식입니다. ISO 8601 형식을 사용해주세요.');
    }

    const searchFilters = {
        query: q.trim(),
        deviceId,
        type,
        since: sinceDate,
        until: untilDate,
        limit,
        offset
    };

    const result = await eventService.searchEvents(req.user.userId, searchFilters);

    const responseLog = createResponseLog(res, 200, '이벤트 검색 성공');
    log('info', responseLog);

    ok(res, {
        events: result.events,
        pagination: result.pagination,
        totalCount: result.totalCount
    });
});

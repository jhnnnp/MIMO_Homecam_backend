// EventController.js
const eventService = require('../service/EventService');

/**
 * 설명: 사용자의 이벤트 목록 조회 (필터링 지원)
 * 입력: req.query (deviceId, since, hasS3, pinned, limit, offset), req.user.userId
 * 출력: 이벤트 목록 및 페이지네이션 정보 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getEvents = async (req, res) => {
    try {
        const filters = {
            deviceId: req.query.deviceId,
            since: req.query.since,
            hasS3: req.query.hasS3 === 'true',
            pinned: req.query.pinned === 'true',
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        };

        const result = await eventService.getEventsByUserId(req.user.userId, filters);

        res.json({
            ok: true,
            data: {
                events: result.events,
                pagination: result.pagination
            }
        });
    } catch (error) {
        console.error('이벤트 목록 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '이벤트 목록을 조회할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 특정 이벤트 상세 정보 조회
 * 입력: req.params.id, req.user.userId
 * 출력: 이벤트 정보 및 클립 목록 JSON
 * 부작용: 없음
 * 예외: 404, 500 에러
 */
exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await eventService.getEventById(id, req.user.userId);

        res.json({
            ok: true,
            data: { event }
        });
    } catch (error) {
        console.error('이벤트 조회 에러:', error.message);

        if (error.message === '이벤트를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '이벤트를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '이벤트 정보를 조회할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 새 이벤트 생성
 * 입력: req.body, req.user.userId
 * 출력: 생성된 이벤트 정보 JSON
 * 부작용: DB 저장
 * 예외: 400, 500 에러
 */
exports.createEvent = async (req, res) => {
    try {
        const eventData = req.body;
        const event = await eventService.createEvent(eventData, req.user.userId);

        res.status(201).json({
            ok: true,
            data: { event },
            message: '이벤트가 성공적으로 생성되었습니다.'
        });
    } catch (error) {
        console.error('이벤트 생성 에러:', error.message);

        if (error.message === '카메라에 접근 권한이 없습니다.') {
            res.status(403).json({
                ok: false,
                error: {
                    code: 'E_FORBIDDEN',
                    message: '카메라에 접근 권한이 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '이벤트를 생성할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 이벤트 정보 업데이트
 * 입력: req.params.id, req.body, req.user.userId
 * 출력: 업데이트된 이벤트 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 404, 500 에러
 */
exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const event = await eventService.updateEvent(id, updateData, req.user.userId);

        res.json({
            ok: true,
            data: { event },
            message: '이벤트 정보가 성공적으로 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('이벤트 업데이트 에러:', error.message);

        if (error.message === '이벤트를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '이벤트를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '이벤트 정보를 업데이트할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 이벤트 삭제
 * 입력: req.params.id, req.user.userId
 * 출력: 삭제 성공 메시지
 * 부작용: DB 삭제
 * 예외: 404, 500 에러
 */
exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await eventService.deleteEvent(id, req.user.userId);

        res.json({
            ok: true,
            message: '이벤트가 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('이벤트 삭제 에러:', error.message);

        if (error.message === '이벤트를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '이벤트를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '이벤트를 삭제할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 이벤트 고정/고정 해제
 * 입력: req.params.id, req.body.isPinned, req.user.userId
 * 출력: 업데이트된 이벤트 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 404, 500 에러
 */
exports.toggleEventPin = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPinned } = req.body;
        const event = await eventService.toggleEventPin(id, isPinned, req.user.userId);

        res.json({
            ok: true,
            data: { event },
            message: `이벤트가 ${isPinned ? '고정' : '고정 해제'}되었습니다.`
        });
    } catch (error) {
        console.error('이벤트 고정 토글 에러:', error.message);

        if (error.message === '이벤트를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '이벤트를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '이벤트 고정 상태를 변경할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 이벤트 통계 정보 조회
 * 입력: req.query (deviceId, since), req.user.userId
 * 출력: 통계 정보 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getEventStats = async (req, res) => {
    try {
        const filters = {
            deviceId: req.query.deviceId,
            since: req.query.since
        };

        const stats = await eventService.getEventStats(req.user.userId, filters);

        res.json({
            ok: true,
            data: { stats }
        });
    } catch (error) {
        console.error('이벤트 통계 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '이벤트 통계를 조회할 수 없습니다.'
            }
        });
    }
};

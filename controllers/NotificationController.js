const notificationService = require('../service/NotificationService');

/**
 * 설명: 사용자의 알림 목록 조회
 * 입력: req.query (isRead, type, limit, offset), req.user.userId
 * 출력: 알림 목록 및 페이지네이션 정보 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getNotifications = async (req, res) => {
    try {
        const filters = {
            isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
            type: req.query.type,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        };

        const result = await notificationService.getNotificationsByUserId(req.user.userId, filters);

        res.json({
            ok: true,
            data: {
                notifications: result.notifications,
                pagination: result.pagination
            }
        });
    } catch (error) {
        console.error('알림 목록 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '알림 목록을 조회할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 특정 알림 조회
 * 입력: req.params.id, req.user.userId
 * 출력: 알림 정보 JSON
 * 부작용: 없음
 * 예외: 404, 500 에러
 */
exports.getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await notificationService.getNotificationById(id, req.user.userId);

        res.json({
            ok: true,
            data: { notification }
        });
    } catch (error) {
        console.error('알림 조회 에러:', error.message);

        if (error.message === '알림을 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '알림을 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '알림 정보를 조회할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 새 알림 생성
 * 입력: req.body, req.user.userId
 * 출력: 생성된 알림 정보 JSON
 * 부작용: DB 저장
 * 예외: 400, 500 에러
 */
exports.createNotification = async (req, res) => {
    try {
        const notificationData = req.body;
        const notification = await notificationService.createNotification(notificationData, req.user.userId);

        res.status(201).json({
            ok: true,
            data: { notification },
            message: '알림이 성공적으로 생성되었습니다.'
        });
    } catch (error) {
        console.error('알림 생성 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '알림을 생성할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 알림 읽음 처리
 * 입력: req.params.id, req.user.userId
 * 출력: 업데이트된 알림 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 404, 500 에러
 */
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await notificationService.markNotificationAsRead(id, req.user.userId);

        res.json({
            ok: true,
            data: { notification },
            message: '알림이 읽음 처리되었습니다.'
        });
    } catch (error) {
        console.error('알림 읽음 처리 에러:', error.message);

        if (error.message === '알림을 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '알림을 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '알림을 읽음 처리할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 모든 알림 읽음 처리
 * 입력: req.user.userId
 * 출력: 업데이트된 알림 수 JSON
 * 부작용: DB 업데이트
 * 예외: 500 에러
 */
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const updatedCount = await notificationService.markAllNotificationsAsRead(req.user.userId);

        res.json({
            ok: true,
            data: { updatedCount },
            message: '모든 알림이 읽음 처리되었습니다.'
        });
    } catch (error) {
        console.error('모든 알림 읽음 처리 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '알림을 읽음 처리할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 알림 삭제
 * 입력: req.params.id, req.user.userId
 * 출력: 삭제 성공 메시지
 * 부작용: DB 삭제
 * 예외: 404, 500 에러
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await notificationService.deleteNotification(id, req.user.userId);

        res.json({
            ok: true,
            message: '알림이 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('알림 삭제 에러:', error.message);

        if (error.message === '알림을 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '알림을 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '알림을 삭제할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 읽지 않은 알림 수 조회
 * 입력: req.user.userId
 * 출력: 읽지 않은 알림 수 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getUnreadNotificationCount = async (req, res) => {
    try {
        const count = await notificationService.getUnreadNotificationCount(req.user.userId);

        res.json({
            ok: true,
            data: { unreadCount: count }
        });
    } catch (error) {
        console.error('읽지 않은 알림 수 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '읽지 않은 알림 수를 조회할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 알림 통계 정보 조회
 * 입력: req.user.userId
 * 출력: 알림 통계 정보 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getNotificationStats = async (req, res) => {
    try {
        const stats = await notificationService.getNotificationStats(req.user.userId);

        res.json({
            ok: true,
            data: { stats }
        });
    } catch (error) {
        console.error('알림 통계 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '알림 통계를 조회할 수 없습니다.'
            }
        });
    }
};

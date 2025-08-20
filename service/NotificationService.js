const { Notification, User } = require('../models');
const { Op } = require('sequelize');

/**
 * 설명: 사용자의 알림 목록 조회
 * 입력: userId, filters (isRead, type, limit, offset)
 * 출력: 알림 목록 및 페이지네이션 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getNotificationsByUserId(userId, filters = {}) {
    try {
        const {
            isRead,
            type,
            limit = 20,
            offset = 0
        } = filters;

        const whereConditions = {
            user_id: userId
        };

        if (isRead !== undefined) {
            whereConditions.is_read = isRead;
        }

        if (type) {
            whereConditions.type = type;
        }

        const notifications = await Notification.findAndCountAll({
            where: whereConditions,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            notifications: notifications.rows,
            pagination: {
                total: notifications.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: notifications.count > parseInt(offset) + notifications.rows.length
            }
        };
    } catch (error) {
        console.error('알림 목록 조회 실패:', error);
        throw new Error('알림 목록을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 특정 알림 조회
 * 입력: notificationId, userId
 * 출력: 알림 정보
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function getNotificationById(notificationId, userId) {
    try {
        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                user_id: userId
            }
        });

        if (!notification) {
            throw new Error('알림을 찾을 수 없습니다.');
        }

        return notification;
    } catch (error) {
        console.error('알림 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 새 알림 생성
 * 입력: notificationData, userId
 * 출력: 생성된 알림 정보
 * 부작용: DB 저장
 * 예외: throw codes E_VALIDATION, E_DATABASE_ERROR
 */
async function createNotification(notificationData, userId) {
    try {
        const notification = await Notification.create({
            ...notificationData,
            user_id: userId,
            is_read: false,
            created_at: new Date()
        });

        return notification;
    } catch (error) {
        console.error('알림 생성 실패:', error);
        throw new Error('알림을 생성할 수 없습니다.');
    }
}

/**
 * 설명: 알림 읽음 처리
 * 입력: notificationId, userId
 * 출력: 업데이트된 알림 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function markNotificationAsRead(notificationId, userId) {
    try {
        const notification = await getNotificationById(notificationId, userId);

        await notification.update({
            is_read: true
        });

        return notification;
    } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
        throw error;
    }
}

/**
 * 설명: 모든 알림 읽음 처리
 * 입력: userId
 * 출력: 업데이트된 알림 수
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function markAllNotificationsAsRead(userId) {
    try {
        const result = await Notification.update(
            { is_read: true },
            {
                where: {
                    user_id: userId,
                    is_read: false
                }
            }
        );

        return result[0]; // 업데이트된 행 수
    } catch (error) {
        console.error('모든 알림 읽음 처리 실패:', error);
        throw new Error('알림을 읽음 처리할 수 없습니다.');
    }
}

/**
 * 설명: 알림 삭제
 * 입력: notificationId, userId
 * 출력: 삭제 성공 여부
 * 부작용: DB 삭제
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function deleteNotification(notificationId, userId) {
    try {
        const notification = await getNotificationById(notificationId, userId);

        await notification.destroy();
        return true;
    } catch (error) {
        console.error('알림 삭제 실패:', error);
        throw error;
    }
}

/**
 * 설명: 읽지 않은 알림 수 조회
 * 입력: userId
 * 출력: 읽지 않은 알림 수
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getUnreadNotificationCount(userId) {
    try {
        const count = await Notification.count({
            where: {
                user_id: userId,
                is_read: false
            }
        });

        return count;
    } catch (error) {
        console.error('읽지 않은 알림 수 조회 실패:', error);
        throw new Error('읽지 않은 알림 수를 조회할 수 없습니다.');
    }
}

/**
 * 설명: 알림 통계 정보 조회
 * 입력: userId
 * 출력: 알림 통계 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getNotificationStats(userId) {
    try {
        // 전체 알림 수
        const totalCount = await Notification.count({
            where: { user_id: userId }
        });

        // 읽지 않은 알림 수
        const unreadCount = await Notification.count({
            where: {
                user_id: userId,
                is_read: false
            }
        });

        // 타입별 알림 수
        const typeStats = await Notification.findAll({
            where: { user_id: userId },
            attributes: [
                'type',
                [Notification.sequelize.fn('COUNT', Notification.sequelize.col('id')), 'count']
            ],
            group: ['type']
        });

        const typeCounts = {};
        typeStats.forEach(item => {
            typeCounts[item.type] = parseInt(item.dataValues.count);
        });

        // 최근 7일 알림 수
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentCount = await Notification.count({
            where: {
                user_id: userId,
                created_at: {
                    [Op.gte]: sevenDaysAgo
                }
            }
        });

        return {
            total: totalCount,
            unread: unreadCount,
            recent: recentCount,
            byType: typeCounts
        };
    } catch (error) {
        console.error('알림 통계 조회 실패:', error);
        throw new Error('알림 통계를 조회할 수 없습니다.');
    }
}

/**
 * 설명: 오래된 알림 정리 (30일 이상)
 * 입력: userId (선택적)
 * 출력: 정리된 알림 수
 * 부작용: DB 삭제
 * 예외: throw codes E_DATABASE_ERROR
 */
async function cleanupOldNotifications(userId = null) {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const whereConditions = {
            created_at: {
                [Op.lt]: thirtyDaysAgo
            },
            is_read: true // 읽은 알림만 삭제
        };

        if (userId) {
            whereConditions.user_id = userId;
        }

        const result = await Notification.destroy({
            where: whereConditions
        });

        return result; // 삭제된 행 수
    } catch (error) {
        console.error('오래된 알림 정리 실패:', error);
        throw new Error('오래된 알림을 정리할 수 없습니다.');
    }
}

module.exports = {
    getNotificationsByUserId,
    getNotificationById,
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadNotificationCount,
    getNotificationStats,
    cleanupOldNotifications
};

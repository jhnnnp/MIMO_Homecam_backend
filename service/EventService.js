const { Event, Camera, Recording } = require('../models');
const { Op } = require('sequelize');

/**
 * 설명: 사용자의 이벤트 목록 조회 (필터링 지원)
 * 입력: userId, filters (deviceId, since, hasS3, pinned, limit, offset)
 * 출력: 이벤트 목록 및 페이지네이션 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getEventsByUserId(userId, filters = {}) {
    try {
        const {
            deviceId,
            since,
            hasS3 = false,
            pinned = false,
            limit = 20,
            offset = 0
        } = filters;

        // 기본 where 조건
        const whereConditions = {};

        // 디바이스 필터
        if (deviceId) {
            whereConditions.camera_id = deviceId;
        }

        // 날짜 필터
        if (since) {
            whereConditions.started_at = {
                [Op.gte]: new Date(since)
            };
        }

        // S3 업로드 여부 필터
        if (hasS3) {
            whereConditions.has_s3 = true;
        }

        // 고정된 이벤트 필터
        if (pinned) {
            whereConditions.is_pinned = true;
        }

        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            return {
                events: [],
                pagination: {
                    total: 0,
                    limit,
                    offset,
                    hasMore: false
                }
            };
        }

        whereConditions.camera_id = {
            [Op.in]: cameraIds
        };

        // 이벤트 조회
        const events = await Event.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Camera,
                    as: 'camera',
                    attributes: ['id', 'name', 'status']
                }
            ],
            order: [['started_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            events: events.rows,
            pagination: {
                total: events.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: events.count > parseInt(offset) + events.rows.length
            }
        };
    } catch (error) {
        console.error('이벤트 목록 조회 실패:', error);
        throw new Error('이벤트 목록을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 특정 이벤트 상세 정보 조회
 * 입력: eventId, userId
 * 출력: 이벤트 정보 및 클립 목록
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function getEventById(eventId, userId) {
    try {
        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        const event = await Event.findOne({
            where: {
                id: eventId,
                camera_id: {
                    [Op.in]: cameraIds
                }
            },
            include: [
                {
                    model: Camera,
                    as: 'camera',
                    attributes: ['id', 'name', 'status']
                },
                {
                    model: Recording,
                    as: 'recordings',
                    attributes: ['id', 'index', 's3_key', 'duration', 'file_size', 'created_at']
                }
            ]
        });

        if (!event) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        return event;
    } catch (error) {
        console.error('이벤트 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 새 이벤트 생성
 * 입력: eventData, userId
 * 출력: 생성된 이벤트 정보
 * 부작용: DB 저장
 * 예외: throw codes E_VALIDATION, E_DATABASE_ERROR
 */
async function createEvent(eventData, userId) {
    try {
        // 사용자가 해당 카메라에 접근 권한이 있는지 확인
        const camera = await Camera.findOne({
            where: {
                id: eventData.camera_id,
                user_id: userId
            }
        });

        if (!camera) {
            throw new Error('카메라에 접근 권한이 없습니다.');
        }

        const event = await Event.create({
            ...eventData,
            started_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });

        return event;
    } catch (error) {
        console.error('이벤트 생성 실패:', error);
        throw error;
    }
}

/**
 * 설명: 이벤트 정보 업데이트
 * 입력: eventId, updateData, userId
 * 출력: 업데이트된 이벤트 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function updateEvent(eventId, updateData, userId) {
    try {
        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        const event = await Event.findOne({
            where: {
                id: eventId,
                camera_id: {
                    [Op.in]: cameraIds
                }
            }
        });

        if (!event) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        await event.update({
            ...updateData,
            updated_at: new Date()
        });

        return event;
    } catch (error) {
        console.error('이벤트 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 이벤트 삭제
 * 입력: eventId, userId
 * 출력: 삭제 성공 여부
 * 부작용: DB 삭제
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function deleteEvent(eventId, userId) {
    try {
        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        const event = await Event.findOne({
            where: {
                id: eventId,
                camera_id: {
                    [Op.in]: cameraIds
                }
            }
        });

        if (!event) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        await event.destroy();
        return true;
    } catch (error) {
        console.error('이벤트 삭제 실패:', error);
        throw error;
    }
}

/**
 * 설명: 이벤트 고정/고정 해제
 * 입력: eventId, isPinned, userId
 * 출력: 업데이트된 이벤트 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function toggleEventPin(eventId, isPinned, userId) {
    try {
        return await updateEvent(eventId, { is_pinned: isPinned }, userId);
    } catch (error) {
        console.error('이벤트 고정 토글 실패:', error);
        throw error;
    }
}

/**
 * 설명: 이벤트 통계 정보 조회
 * 입력: userId, filters (deviceId, since)
 * 출력: 통계 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getEventStats(userId, filters = {}) {
    try {
        const { deviceId, since } = filters;

        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            return {
                totalEvents: 0,
                todayEvents: 0,
                totalDuration: 0,
                totalSize: 0,
                eventsByType: {}
            };
        }

        // 기본 where 조건
        const whereConditions = {
            camera_id: {
                [Op.in]: cameraIds
            }
        };

        if (deviceId) {
            whereConditions.camera_id = deviceId;
        }

        if (since) {
            whereConditions.started_at = {
                [Op.gte]: new Date(since)
            };
        }

        // 전체 이벤트 수
        const totalEvents = await Event.count({ where: whereConditions });

        // 오늘 이벤트 수
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEvents = await Event.count({
            where: {
                ...whereConditions,
                started_at: {
                    [Op.gte]: today
                }
            }
        });

        // 이벤트 타입별 통계
        const eventsByType = await Event.findAll({
            where: whereConditions,
            attributes: [
                'type',
                [Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'count']
            ],
            group: ['type']
        });

        const typeStats = {};
        eventsByType.forEach(item => {
            typeStats[item.type] = parseInt(item.dataValues.count);
        });

        return {
            totalEvents,
            todayEvents,
            totalDuration: 0, // 클립 테이블에서 계산 필요
            totalSize: 0, // 클립 테이블에서 계산 필요
            eventsByType: typeStats
        };
    } catch (error) {
        console.error('이벤트 통계 조회 실패:', error);
        throw new Error('이벤트 통계를 조회할 수 없습니다.');
    }
}

module.exports = {
    getEventsByUserId,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleEventPin,
    getEventStats
};

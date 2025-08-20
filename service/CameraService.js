const { Camera, User, Event } = require('../models');
const { Op } = require('sequelize');

/**
 * 설명: 사용자의 모든 카메라 목록 조회
 * 입력: userId
 * 출력: 카메라 목록
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getCamerasByUserId(userId) {
    try {
        const cameras = await Camera.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'email', 'name']
                }
            ]
        });

        return cameras;
    } catch (error) {
        console.error('카메라 목록 조회 실패:', error);
        throw new Error('카메라 목록을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 특정 카메라 상세 정보 조회
 * 입력: cameraId, userId
 * 출력: 카메라 정보
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function getCameraById(cameraId, userId) {
    try {
        const camera = await Camera.findOne({
            where: {
                id: cameraId,
                user_id: userId
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'email', 'name']
                }
            ]
        });

        if (!camera) {
            throw new Error('카메라를 찾을 수 없습니다.');
        }

        return camera;
    } catch (error) {
        console.error('카메라 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 새 카메라 등록
 * 입력: cameraData, userId
 * 출력: 생성된 카메라 정보
 * 부작용: DB 저장
 * 예외: throw codes E_VALIDATION, E_DATABASE_ERROR
 */
async function createCamera(cameraData, userId) {
    try {
        const camera = await Camera.create({
            ...cameraData,
            user_id: userId,
            status: 'offline',
            created_at: new Date(),
            updated_at: new Date()
        });

        return camera;
    } catch (error) {
        console.error('카메라 생성 실패:', error);
        throw new Error('카메라를 생성할 수 없습니다.');
    }
}

/**
 * 설명: 카메라 정보 업데이트
 * 입력: cameraId, updateData, userId
 * 출력: 업데이트된 카메라 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function updateCamera(cameraId, updateData, userId) {
    try {
        const camera = await Camera.findOne({
            where: {
                id: cameraId,
                user_id: userId
            }
        });

        if (!camera) {
            throw new Error('카메라를 찾을 수 없습니다.');
        }

        await camera.update({
            ...updateData,
            updated_at: new Date()
        });

        return camera;
    } catch (error) {
        console.error('카메라 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 카메라 삭제
 * 입력: cameraId, userId
 * 출력: 삭제 성공 여부
 * 부작용: DB 삭제
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function deleteCamera(cameraId, userId) {
    try {
        const camera = await Camera.findOne({
            where: {
                id: cameraId,
                user_id: userId
            }
        });

        if (!camera) {
            throw new Error('카메라를 찾을 수 없습니다.');
        }

        await camera.destroy();
        return true;
    } catch (error) {
        console.error('카메라 삭제 실패:', error);
        throw error;
    }
}

/**
 * 설명: 카메라 상태 업데이트 (하트비트)
 * 입력: cameraId, status
 * 출력: 업데이트된 카메라 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function updateCameraStatus(cameraId, status) {
    try {
        const camera = await Camera.findByPk(cameraId);

        if (!camera) {
            throw new Error('카메라를 찾을 수 없습니다.');
        }

        await camera.update({
            status: status,
            last_heartbeat: new Date(),
            updated_at: new Date()
        });

        return camera;
    } catch (error) {
        console.error('카메라 상태 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 카메라 통계 정보 조회
 * 입력: cameraId, userId
 * 출력: 통계 정보
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function getCameraStats(cameraId, userId) {
    try {
        const camera = await getCameraById(cameraId, userId);

        // 최근 30일 이벤트 수 조회
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const eventCount = await Event.count({
            where: {
                camera_id: cameraId,
                started_at: {
                    [Op.gte]: thirtyDaysAgo
                }
            }
        });

        // 오늘 이벤트 수 조회
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEventCount = await Event.count({
            where: {
                camera_id: cameraId,
                started_at: {
                    [Op.gte]: today
                }
            }
        });

        return {
            cameraId: camera.id,
            cameraName: camera.name,
            status: camera.status,
            totalEvents: eventCount,
            todayEvents: todayEventCount,
            lastHeartbeat: camera.last_heartbeat,
            uptime: camera.status === 'online' ?
                Math.floor((new Date() - new Date(camera.last_heartbeat)) / 1000) : 0
        };
    } catch (error) {
        console.error('카메라 통계 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 오프라인 카메라 정리 (30분 이상 하트비트 없는 카메라)
 * 입력: 없음
 * 출력: 정리된 카메라 수
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function cleanupOfflineCameras() {
    try {
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        const result = await Camera.update(
            {
                status: 'offline',
                updated_at: new Date()
            },
            {
                where: {
                    status: 'online',
                    last_heartbeat: {
                        [Op.lt]: thirtyMinutesAgo
                    }
                }
            }
        );

        return result[0]; // 업데이트된 행 수
    } catch (error) {
        console.error('오프라인 카메라 정리 실패:', error);
        throw new Error('카메라 상태 정리에 실패했습니다.');
    }
}

module.exports = {
    getCamerasByUserId,
    getCameraById,
    createCamera,
    updateCamera,
    deleteCamera,
    updateCameraStatus,
    getCameraStats,
    cleanupOfflineCameras
};

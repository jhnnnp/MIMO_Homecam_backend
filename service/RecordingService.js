const { Recording, Event, Camera } = require('../models');
const { Op } = require('sequelize');

/**
 * 설명: 사용자의 녹화 파일 목록 조회
 * 입력: userId, filters (eventId, deviceId, limit, offset)
 * 출력: 녹화 파일 목록 및 페이지네이션 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getRecordingsByUserId(userId, filters = {}) {
    try {
        const {
            eventId,
            deviceId,
            limit = 20,
            offset = 0
        } = filters;

        const whereConditions = {};

        if (eventId) {
            whereConditions.event_id = eventId;
        }

        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            return {
                recordings: [],
                pagination: {
                    total: 0,
                    limit,
                    offset,
                    hasMore: false
                }
            };
        }

        if (deviceId) {
            if (!cameraIds.includes(parseInt(deviceId))) {
                throw new Error('카메라에 접근 권한이 없습니다.');
            }
            whereConditions.device_id = deviceId;
        }

        const recordings = await Recording.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Event,
                    as: 'event',
                    where: {
                        camera_id: {
                            [Op.in]: cameraIds
                        }
                    },
                    attributes: ['id', 'type', 'started_at']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            recordings: recordings.rows,
            pagination: {
                total: recordings.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: recordings.count > parseInt(offset) + recordings.rows.length
            }
        };
    } catch (error) {
        console.error('녹화 파일 목록 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 특정 녹화 파일 조회
 * 입력: recordingId, userId
 * 출력: 녹화 파일 정보
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function getRecordingById(recordingId, userId) {
    try {
        // 사용자의 카메라 ID 목록 조회
        const userCameras = await Camera.findAll({
            where: { user_id: userId },
            attributes: ['id']
        });

        const cameraIds = userCameras.map(camera => camera.id);

        if (cameraIds.length === 0) {
            throw new Error('녹화 파일을 찾을 수 없습니다.');
        }

        const recording = await Recording.findOne({
            where: { id: recordingId },
            include: [
                {
                    model: Event,
                    as: 'event',
                    where: {
                        camera_id: {
                            [Op.in]: cameraIds
                        }
                    },
                    attributes: ['id', 'type', 'started_at', 'camera_id']
                }
            ]
        });

        if (!recording) {
            throw new Error('녹화 파일을 찾을 수 없습니다.');
        }

        return recording;
    } catch (error) {
        console.error('녹화 파일 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 새 녹화 파일 생성
 * 입력: recordingData, userId
 * 출력: 생성된 녹화 파일 정보
 * 부작용: DB 저장
 * 예외: throw codes E_VALIDATION, E_DATABASE_ERROR
 */
async function createRecording(recordingData, userId) {
    try {
        // 사용자가 해당 이벤트에 접근 권한이 있는지 확인
        const event = await Event.findOne({
            where: { id: recordingData.event_id },
            include: [
                {
                    model: Camera,
                    as: 'camera',
                    where: { user_id: userId },
                    attributes: ['id']
                }
            ]
        });

        if (!event) {
            throw new Error('이벤트에 접근 권한이 없습니다.');
        }

        const recording = await Recording.create({
            ...recordingData,
            created_at: new Date(),
            updated_at: new Date()
        });

        return recording;
    } catch (error) {
        console.error('녹화 파일 생성 실패:', error);
        throw error;
    }
}

/**
 * 설명: 녹화 파일 정보 업데이트
 * 입력: recordingId, updateData, userId
 * 출력: 업데이트된 녹화 파일 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function updateRecording(recordingId, updateData, userId) {
    try {
        const recording = await getRecordingById(recordingId, userId);

        await recording.update({
            ...updateData,
            updated_at: new Date()
        });

        return recording;
    } catch (error) {
        console.error('녹화 파일 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 녹화 파일 삭제
 * 입력: recordingId, userId
 * 출력: 삭제 성공 여부
 * 부작용: DB 삭제
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function deleteRecording(recordingId, userId) {
    try {
        const recording = await getRecordingById(recordingId, userId);

        await recording.destroy();
        return true;
    } catch (error) {
        console.error('녹화 파일 삭제 실패:', error);
        throw error;
    }
}

/**
 * 설명: 이벤트별 녹화 파일 목록 조회
 * 입력: eventId, userId
 * 출력: 녹화 파일 목록
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function getRecordingsByEventId(eventId, userId) {
    try {
        // 사용자가 해당 이벤트에 접근 권한이 있는지 확인
        const event = await Event.findOne({
            where: { id: eventId },
            include: [
                {
                    model: Camera,
                    as: 'camera',
                    where: { user_id: userId },
                    attributes: ['id']
                }
            ]
        });

        if (!event) {
            throw new Error('이벤트를 찾을 수 없습니다.');
        }

        const recordings = await Recording.findAll({
            where: { event_id: eventId },
            order: [['index', 'ASC']]
        });

        return recordings;
    } catch (error) {
        console.error('이벤트별 녹화 파일 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 녹화 파일 통계 정보 조회
 * 입력: userId, filters (deviceId, since)
 * 출력: 통계 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getRecordingStats(userId, filters = {}) {
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
                totalRecordings: 0,
                totalSize: 0,
                totalDuration: 0,
                averageSize: 0,
                averageDuration: 0
            };
        }

        const whereConditions = {};

        if (deviceId) {
            if (!cameraIds.includes(parseInt(deviceId))) {
                throw new Error('카메라에 접근 권한이 없습니다.');
            }
            whereConditions.device_id = deviceId;
        }

        if (since) {
            whereConditions.created_at = {
                [Op.gte]: new Date(since)
            };
        }

        const recordings = await Recording.findAll({
            where: whereConditions,
            include: [
                {
                    model: Event,
                    as: 'event',
                    where: {
                        camera_id: {
                            [Op.in]: cameraIds
                        }
                    },
                    attributes: ['id']
                }
            ]
        });

        const totalRecordings = recordings.length;
        const totalSize = recordings.reduce((sum, rec) => sum + (rec.file_size || 0), 0);
        const totalDuration = recordings.reduce((sum, rec) => sum + (rec.duration || 0), 0);
        const averageSize = totalRecordings > 0 ? totalSize / totalRecordings : 0;
        const averageDuration = totalRecordings > 0 ? totalDuration / totalRecordings : 0;

        return {
            totalRecordings,
            totalSize,
            totalDuration,
            averageSize: Math.round(averageSize),
            averageDuration: Math.round(averageDuration)
        };
    } catch (error) {
        console.error('녹화 파일 통계 조회 실패:', error);
        throw error;
    }
}

module.exports = {
    getRecordingsByUserId,
    getRecordingById,
    createRecording,
    updateRecording,
    deleteRecording,
    getRecordingsByEventId,
    getRecordingStats
};

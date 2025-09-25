const { Camera, User, Event, DevicePermissions } = require('../models');
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
            where: { owner_id: userId },
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'owner',
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
 * 설명: 사용자의 등록된 카메라 수 조회
 * 입력: userId
 * 출력: 카메라 수 (number)
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getCameraCountByUserId(userId) {
    try {
        const count = await Camera.count({
            where: { owner_id: userId }
        });

        return count;
    } catch (error) {
        console.error('카메라 수 조회 실패:', error);
        throw new Error('카메라 수를 조회할 수 없습니다.');
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
                owner_id: userId
            },
            include: [
                {
                    model: User,
                    as: 'owner',
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
            owner_id: userId,
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
 * 설명: device_id 기준으로 카메라 생성 또는 업데이트
 * 입력: deviceId, name, userId, status
 * 출력: 생성/업데이트된 카메라 정보
 */
async function createOrUpdateCameraByDeviceId(deviceId, name, userId, status = 'offline') {
    try {
        let camera = await Camera.findOne({ where: { device_id: deviceId, owner_id: userId } });

        if (camera) {
            await camera.update({ name, status, updated_at: new Date() });
            return camera;
        }

        camera = await Camera.create({
            device_id: deviceId,
            name,
            owner_id: userId,
            status,
            created_at: new Date(),
            updated_at: new Date()
        });
        return camera;
    } catch (error) {
        console.error('카메라 upsert 실패:', error);
        throw new Error('카메라 저장에 실패했습니다.');
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
                owner_id: userId
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
                owner_id: userId
            }
        });

        if (!camera) {
            throw new Error('카메라를 찾을 수 없습니다.');
        }

        // 삭제하기 전에 카메라 정보 저장
        const deletedCameraInfo = {
            id: camera.id,
            name: camera.name,
            device_id: camera.device_id,
            location: camera.location
        };

        await camera.destroy();
        return deletedCameraInfo;
    } catch (error) {
        console.error('카메라 삭제 실패:', error);
        throw error;
    }
}

/**
 * 설명: ID로 카메라 삭제 (컨트롤러용)
 * 입력: cameraId, userId
 * 출력: 삭제된 카메라 정보
 * 부작용: DB 삭제
 * 예외: throw codes E_NOT_FOUND, E_DATABASE_ERROR
 */
async function deleteCameraById(cameraId, userId) {
    return await deleteCamera(cameraId, userId);
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

/**
 * 설명: 사용자가 접근 가능한 모든 카메라 목록 조회 (소유 + 공유받은)
 * 입력: userId
 * 출력: 카메라 목록 (소유자 정보 및 권한 레벨 포함)
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getAccessibleCamerasByUserId(userId) {
    try {
        // 1. 소유한 카메라 조회
        const ownedCameras = await Camera.findAll({
            where: { owner_id: userId },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'email', 'name']
                }
            ]
        });

        // 소유한 카메라에 권한 레벨 추가
        const ownedCamerasWithPermission = ownedCameras.map(camera => {
            const cameraData = camera.toJSON();
            cameraData.permission_level = 'admin';
            cameraData.access_type = 'owner';
            return cameraData;
        });

        // 2. 공유받은 카메라 조회
        const sharedCameras = await DevicePermissions.findAll({
            where: {
                user_id: userId,
                is_active: true,
                [Op.or]: [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ]
            },
            include: [
                {
                    model: Camera,
                    as: 'camera',
                    include: [
                        {
                            model: User,
                            as: 'owner',
                            attributes: ['id', 'email', 'name']
                        }
                    ]
                }
            ]
        });

        // 공유받은 카메라에 권한 정보 추가
        const sharedCamerasWithPermission = sharedCameras.map(permission => {
            const cameraData = permission.camera.toJSON();
            cameraData.permission_level = permission.permission_level;
            cameraData.access_type = 'shared';
            cameraData.granted_at = permission.granted_at;
            cameraData.expires_at = permission.expires_at;
            return cameraData;
        });

        // 3. 결과 합치기
        const allCameras = [...ownedCamerasWithPermission, ...sharedCamerasWithPermission];

        return allCameras.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
        console.error('접근 가능한 카메라 목록 조회 실패:', error);
        throw new Error('카메라 목록을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 카메라 공유 권한 부여
 * 입력: cameraId, targetUserId, permissionLevel, grantedByUserId, options
 * 출력: 생성된 권한 정보
 * 부작용: DB 삽입
 * 예외: throw codes E_CAMERA_NOT_FOUND, E_PERMISSION_DENIED, E_DATABASE_ERROR
 */
async function grantCameraPermission(cameraId, targetUserId, permissionLevel, grantedByUserId, options = {}) {
    try {
        // 1. 카메라 존재 및 소유권 확인
        const camera = await Camera.findOne({
            where: { id: cameraId, owner_id: grantedByUserId }
        });

        if (!camera) {
            throw new Error('카메라를 찾을 수 없거나 권한이 없습니다.');
        }

        // 2. 대상 사용자 존재 확인
        const targetUser = await User.findByPk(targetUserId);
        if (!targetUser) {
            throw new Error('대상 사용자를 찾을 수 없습니다.');
        }

        // 3. 기존 권한 확인 및 업데이트
        const existingPermission = await DevicePermissions.findOne({
            where: { camera_id: cameraId, user_id: targetUserId }
        });

        let permission;
        if (existingPermission) {
            // 기존 권한 업데이트
            permission = await existingPermission.update({
                permission_level: permissionLevel,
                granted_by: grantedByUserId,
                granted_at: new Date(),
                expires_at: options.expires_at || null,
                is_active: true,
                notes: options.notes || null
            });
        } else {
            // 새 권한 생성
            permission = await DevicePermissions.create({
                camera_id: cameraId,
                user_id: targetUserId,
                permission_level: permissionLevel,
                granted_by: grantedByUserId,
                granted_at: new Date(),
                expires_at: options.expires_at || null,
                is_active: true,
                notes: options.notes || null
            });
        }

        return permission;
    } catch (error) {
        console.error('카메라 권한 부여 실패:', error);
        throw error;
    }
}

/**
 * 설명: 사용자의 카메라 접근 권한 확인
 * 입력: cameraId, userId
 * 출력: 권한 정보 (소유자인 경우 admin, 공유받은 경우 해당 레벨, 없으면 null)
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getUserCameraPermission(cameraId, userId) {
    try {
        // 1. 소유자인지 확인
        const ownedCamera = await Camera.findOne({
            where: { id: cameraId, owner_id: userId }
        });

        if (ownedCamera) {
            return {
                access_type: 'owner',
                permission_level: 'admin',
                camera: ownedCamera
            };
        }

        // 2. 공유받은 권한 확인
        const sharedPermission = await DevicePermissions.findOne({
            where: {
                camera_id: cameraId,
                user_id: userId,
                is_active: true,
                [Op.or]: [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ]
            },
            include: [
                {
                    model: Camera,
                    as: 'camera'
                }
            ]
        });

        if (sharedPermission) {
            return {
                access_type: 'shared',
                permission_level: sharedPermission.permission_level,
                camera: sharedPermission.camera,
                granted_at: sharedPermission.granted_at,
                expires_at: sharedPermission.expires_at
            };
        }

        return null; // 접근 권한 없음
    } catch (error) {
        console.error('사용자 카메라 권한 확인 실패:', error);
        throw error;
    }
}

module.exports = {
    getCamerasByUserId,
    getCameraCountByUserId,
    getCameraById,
    createCamera,
    updateCamera,
    deleteCamera,
    deleteCameraById,
    updateCameraStatus,
    getCameraStats,
    cleanupOfflineCameras,
    createOrUpdateCameraByDeviceId,
    // 새로운 공유 기능
    getAccessibleCamerasByUserId,
    grantCameraPermission,
    getUserCameraPermission
};

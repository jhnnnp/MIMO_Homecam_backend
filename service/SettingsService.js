const { Settings, User } = require('../models');

/**
 * 설명: 사용자의 설정 조회
 * 입력: userId
 * 출력: 설정 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getSettingsByUserId(userId) {
    try {
        let settings = await Settings.findOne({
            where: { user_id: userId }
        });

        // 설정이 없으면 기본 설정 생성
        if (!settings) {
            settings = await Settings.create({
                user_id: userId,
                notification_enabled: true,
                email_notification: true,
                motion_sensitivity: 'medium',
                recording_quality: '720p',
                storage_limit_gb: 10,
                auto_delete_days: 30,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        return settings;
    } catch (error) {
        console.error('설정 조회 실패:', error);
        throw new Error('설정을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 사용자 설정 업데이트
 * 입력: userId, updateData
 * 출력: 업데이트된 설정 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function updateSettings(userId, updateData) {
    try {
        let settings = await Settings.findOne({
            where: { user_id: userId }
        });

        if (!settings) {
            // 설정이 없으면 새로 생성
            settings = await Settings.create({
                user_id: userId,
                ...updateData,
                created_at: new Date(),
                updated_at: new Date()
            });
        } else {
            // 기존 설정 업데이트
            await settings.update({
                ...updateData,
                updated_at: new Date()
            });
        }

        return settings;
    } catch (error) {
        console.error('설정 업데이트 실패:', error);
        throw new Error('설정을 업데이트할 수 없습니다.');
    }
}

/**
 * 설명: 특정 설정 값 조회
 * 입력: userId, settingKey
 * 출력: 설정 값
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getSettingValue(userId, settingKey) {
    try {
        const settings = await getSettingsByUserId(userId);
        return settings[settingKey];
    } catch (error) {
        console.error('설정 값 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 특정 설정 값 업데이트
 * 입력: userId, settingKey, value
 * 출력: 업데이트된 설정 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function updateSettingValue(userId, settingKey, value) {
    try {
        const updateData = {};
        updateData[settingKey] = value;

        return await updateSettings(userId, updateData);
    } catch (error) {
        console.error('설정 값 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 설정 초기화 (기본값으로 복원)
 * 입력: userId
 * 출력: 초기화된 설정 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function resetSettings(userId) {
    try {
        const defaultSettings = {
            notification_enabled: true,
            email_notification: true,
            motion_sensitivity: 'medium',
            recording_quality: '720p',
            storage_limit_gb: 10,
            auto_delete_days: 30
        };

        return await updateSettings(userId, defaultSettings);
    } catch (error) {
        console.error('설정 초기화 실패:', error);
        throw new Error('설정을 초기화할 수 없습니다.');
    }
}

/**
 * 설명: 카메라별 설정 조회
 * 입력: userId, cameraId
 * 출력: 카메라별 설정 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getCameraSettings(userId, cameraId) {
    try {
        // 사용자의 카메라인지 확인
        const user = await User.findByPk(userId, {
            include: [
                {
                    model: require('../models/Camera'),
                    as: 'cameras',
                    where: { id: cameraId },
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!user || user.cameras.length === 0) {
            throw new Error('카메라에 접근 권한이 없습니다.');
        }

        // 카메라별 설정은 현재 전역 설정을 반환
        // 향후 카메라별 개별 설정 테이블 추가 가능
        const globalSettings = await getSettingsByUserId(userId);

        return {
            cameraId: cameraId,
            cameraName: user.cameras[0].name,
            settings: globalSettings
        };
    } catch (error) {
        console.error('카메라 설정 조회 실패:', error);
        throw error;
    }
}

/**
 * 설명: 카메라별 설정 업데이트
 * 입력: userId, cameraId, updateData
 * 출력: 업데이트된 카메라별 설정 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function updateCameraSettings(userId, cameraId, updateData) {
    try {
        // 사용자의 카메라인지 확인
        const user = await User.findByPk(userId, {
            include: [
                {
                    model: require('../models/Camera'),
                    as: 'cameras',
                    where: { id: cameraId },
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!user || user.cameras.length === 0) {
            throw new Error('카메라에 접근 권한이 없습니다.');
        }

        // 현재는 전역 설정을 업데이트
        // 향후 카메라별 개별 설정 테이블 추가 가능
        const updatedSettings = await updateSettings(userId, updateData);

        return {
            cameraId: cameraId,
            cameraName: user.cameras[0].name,
            settings: updatedSettings
        };
    } catch (error) {
        console.error('카메라 설정 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 설정 유효성 검증
 * 입력: settingsData
 * 출력: 검증 결과
 * 부작용: 없음
 * 예외: throw codes E_VALIDATION
 */
async function validateSettings(settingsData) {
    const errors = [];

    // 알림 설정 검증
    if (settingsData.notification_enabled !== undefined &&
        typeof settingsData.notification_enabled !== 'boolean') {
        errors.push('notification_enabled는 boolean 값이어야 합니다.');
    }

    if (settingsData.email_notification !== undefined &&
        typeof settingsData.email_notification !== 'boolean') {
        errors.push('email_notification는 boolean 값이어야 합니다.');
    }

    // 모션 감도 검증
    if (settingsData.motion_sensitivity &&
        !['low', 'medium', 'high'].includes(settingsData.motion_sensitivity)) {
        errors.push('motion_sensitivity는 low, medium, high 중 하나여야 합니다.');
    }

    // 녹화 품질 검증
    if (settingsData.recording_quality &&
        !['480p', '720p', '1080p'].includes(settingsData.recording_quality)) {
        errors.push('recording_quality는 480p, 720p, 1080p 중 하나여야 합니다.');
    }

    // 저장소 제한 검증
    if (settingsData.storage_limit_gb !== undefined) {
        const limit = parseInt(settingsData.storage_limit_gb);
        if (isNaN(limit) || limit < 1 || limit > 1000) {
            errors.push('storage_limit_gb는 1-1000 사이의 숫자여야 합니다.');
        }
    }

    // 자동 삭제 일수 검증
    if (settingsData.auto_delete_days !== undefined) {
        const days = parseInt(settingsData.auto_delete_days);
        if (isNaN(days) || days < 1 || days > 365) {
            errors.push('auto_delete_days는 1-365 사이의 숫자여야 합니다.');
        }
    }

    if (errors.length > 0) {
        throw new Error(`설정 검증 실패: ${errors.join(', ')}`);
    }

    return true;
}

/**
 * 설명: 설정 내보내기 (백업용)
 * 입력: userId
 * 출력: 설정 JSON
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function exportSettings(userId) {
    try {
        const settings = await getSettingsByUserId(userId);

        return {
            userId: userId,
            exportedAt: new Date().toISOString(),
            settings: settings.toJSON()
        };
    } catch (error) {
        console.error('설정 내보내기 실패:', error);
        throw new Error('설정을 내보낼 수 없습니다.');
    }
}

/**
 * 설명: 설정 가져오기 (복원용)
 * 입력: userId, settingsData
 * 출력: 가져온 설정 정보
 * 부작용: DB 업데이트
 * 예외: throw codes E_VALIDATION, E_DATABASE_ERROR
 */
async function importSettings(userId, settingsData) {
    try {
        // 설정 데이터 검증
        await validateSettings(settingsData);

        // 설정 업데이트
        const updatedSettings = await updateSettings(userId, settingsData);

        return {
            userId: userId,
            importedAt: new Date().toISOString(),
            settings: updatedSettings
        };
    } catch (error) {
        console.error('설정 가져오기 실패:', error);
        throw error;
    }
}

module.exports = {
    getSettingsByUserId,
    updateSettings,
    getSettingValue,
    updateSettingValue,
    resetSettings,
    getCameraSettings,
    updateCameraSettings,
    validateSettings,
    exportSettings,
    importSettings
};

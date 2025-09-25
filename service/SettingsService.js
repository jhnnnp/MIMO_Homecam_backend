const { UserSettings, UserCustomSettings, User } = require('../models');
const { Op } = require('sequelize');

/**
 * 설명: 사용자의 모든 설정 조회 (고정 + 커스텀)
 * 입력: userId
 * 출력: 통합 설정 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getAllUserSettings(userId) {
    try {
        // 1. 핵심 설정 조회
        const coreSettings = await getCoreSettings(userId);

        // 2. 커스텀 설정 조회
        const customSettings = await getCustomSettings(userId);

        // 3. 통합하여 반환
        return {
            core: coreSettings,
            custom: customSettings,
            combined: {
                ...coreSettings,
                ...customSettings
            }
        };
    } catch (error) {
        console.error('전체 설정 조회 실패:', error);
        throw new Error('설정을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 사용자의 핵심 설정 조회 (UserSettings 테이블)
 * 입력: userId
 * 출력: 핵심 설정 정보
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getCoreSettings(userId) {
    try {
        let coreSettings = await UserSettings.findOne({
            where: { user_id: userId }
        });

        // 설정이 없으면 기본 설정 생성
        if (!coreSettings) {
            coreSettings = await UserSettings.create({
                user_id: userId,
                notification_enabled: true,
                motion_sensitivity: 'medium',
                auto_recording: true,
                recording_quality: '1080p',
                storage_days: 30,
                dark_mode: false,
                language: 'ko',
                timezone: 'Asia/Seoul'
            });
        }

        // 객체 형태로 반환 (Sequelize 인스턴스가 아닌)
        return coreSettings.toJSON ? coreSettings.toJSON() : coreSettings;
    } catch (error) {
        console.error('핵심 설정 조회 실패:', error);
        throw new Error('핵심 설정을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 사용자의 커스텀 설정 조회 (UserCustomSettings 테이블)
 * 입력: userId
 * 출력: 커스텀 설정 정보 (Key-Value 객체)
 * 부작용: DB 조회
 * 예외: throw codes E_DATABASE_ERROR
 */
async function getCustomSettings(userId) {
    try {
        const customSettingsArray = await UserCustomSettings.findAll({
            where: { user_id: userId },
            order: [['setting_key', 'ASC']]
        });

        // Key-Value 객체로 변환
        const customSettings = {};
        for (const setting of customSettingsArray) {
            const { setting_key, setting_value, data_type } = setting;

            // 데이터 타입에 따라 값 파싱
            let parsedValue = setting_value;
            try {
                switch (data_type) {
                    case 'number':
                        parsedValue = Number(setting_value);
                        break;
                    case 'boolean':
                        parsedValue = setting_value === 'true' || setting_value === true;
                        break;
                    case 'json':
                        parsedValue = JSON.parse(setting_value);
                        break;
                    default:
                        parsedValue = setting_value;
                }
            } catch (parseError) {
                console.warn(`설정 값 파싱 실패 (${setting_key}):`, parseError);
                parsedValue = setting_value; // 원본 값 유지
            }

            customSettings[setting_key] = parsedValue;
        }

        return customSettings;
    } catch (error) {
        console.error('커스텀 설정 조회 실패:', error);
        throw new Error('커스텀 설정을 조회할 수 없습니다.');
    }
}

/**
 * 설명: 핵심 설정 업데이트
 * 입력: userId, updateData
 * 출력: 업데이트된 핵심 설정
 * 부작용: DB 업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function updateCoreSettings(userId, updateData) {
    try {
        // 사용자 존재 확인
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        // 기존 설정 조회 또는 생성
        let coreSettings = await UserSettings.findOne({
            where: { user_id: userId }
        });

        if (coreSettings) {
            // 기존 설정 업데이트
            await coreSettings.update({
                ...updateData,
                updated_at: new Date()
            });
        } else {
            // 새 설정 생성
            coreSettings = await UserSettings.create({
                user_id: userId,
                ...updateData
            });
        }

        return coreSettings.toJSON ? coreSettings.toJSON() : coreSettings;
    } catch (error) {
        console.error('핵심 설정 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 커스텀 설정 업데이트 (단일 설정)
 * 입력: userId, key, value, dataType
 * 출력: 업데이트된 커스텀 설정
 * 부작용: DB 업데이트/생성
 * 예외: throw codes E_DATABASE_ERROR
 */
async function updateCustomSetting(userId, key, value, dataType = 'string') {
    try {
        // 값을 문자열로 변환 (JSON은 stringify)
        let stringValue = value;
        if (dataType === 'json') {
            stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        } else if (dataType === 'boolean') {
            stringValue = String(value);
        } else if (dataType === 'number') {
            stringValue = String(value);
        } else {
            stringValue = String(value);
        }

        // 기존 설정 확인 및 업데이트 또는 생성
        const [customSetting, created] = await UserCustomSettings.upsert({
            user_id: userId,
            setting_key: key,
            setting_value: stringValue,
            data_type: dataType,
            updated_at: new Date()
        }, {
            returning: true
        });

        return customSetting.toJSON ? customSetting.toJSON() : customSetting;
    } catch (error) {
        console.error('커스텀 설정 업데이트 실패:', error);
        throw error;
    }
}

/**
 * 설명: 커스텀 설정 삭제
 * 입력: userId, key
 * 출력: 삭제 결과
 * 부작용: DB 삭제
 * 예외: throw codes E_DATABASE_ERROR
 */
async function deleteCustomSetting(userId, key) {
    try {
        const deletedCount = await UserCustomSettings.destroy({
            where: {
                user_id: userId,
                setting_key: key
            }
        });

        return deletedCount > 0;
    } catch (error) {
        console.error('커스텀 설정 삭제 실패:', error);
        throw error;
    }
}

/**
 * 설명: 사용자 설정 초기화
 * 입력: userId, resetType ('core', 'custom', 'all')
 * 출력: 초기화 결과
 * 부작용: DB 삭제/업데이트
 * 예외: throw codes E_DATABASE_ERROR
 */
async function resetUserSettings(userId, resetType) {
    try {
        const result = { core: false, custom: false };

        if (resetType === 'core' || resetType === 'all') {
            // 핵심 설정을 기본값으로 재설정
            await UserSettings.upsert({
                user_id: userId,
                notification_enabled: true,
                motion_sensitivity: 'medium',
                auto_recording: true,
                recording_quality: '1080p',
                storage_days: 30,
                dark_mode: false,
                language: 'ko',
                timezone: 'Asia/Seoul',
                updated_at: new Date()
            });
            result.core = true;
        }

        if (resetType === 'custom' || resetType === 'all') {
            // 모든 커스텀 설정 삭제
            const deletedCount = await UserCustomSettings.destroy({
                where: { user_id: userId }
            });
            result.custom = deletedCount > 0;
        }

        return result;
    } catch (error) {
        console.error('설정 초기화 실패:', error);
        throw error;
    }
}

/**
 * 설명: 설정 데이터 검증
 * 입력: updateData
 * 출력: 검증 결과
 * 부작용: 없음
 * 예외: throw codes E_VALIDATION_ERROR
 */
async function validateCoreSettings(updateData) {
    const allowedMotionSensitivity = ['low', 'medium', 'high'];
    const allowedRecordingQuality = ['720p', '1080p', '4K'];
    const allowedLanguages = ['ko', 'en', 'ja', 'zh'];

    if (updateData.motion_sensitivity && !allowedMotionSensitivity.includes(updateData.motion_sensitivity)) {
        throw new Error('유효하지 않은 모션 감지 민감도입니다.');
    }

    if (updateData.recording_quality && !allowedRecordingQuality.includes(updateData.recording_quality)) {
        throw new Error('유효하지 않은 녹화 품질입니다.');
    }

    if (updateData.language && !allowedLanguages.includes(updateData.language)) {
        throw new Error('지원하지 않는 언어입니다.');
    }

    if (updateData.storage_days && (updateData.storage_days < 1 || updateData.storage_days > 365)) {
        throw new Error('저장 기간은 1일부터 365일까지 설정할 수 있습니다.');
    }

    return true;
}

module.exports = {
    getAllUserSettings,
    getCoreSettings,
    getCustomSettings,
    updateCoreSettings,
    updateCustomSetting,
    deleteCustomSetting,
    resetUserSettings,
    validateCoreSettings
};
// SettingsController.js
const settingsService = require('../service/SettingsService');
const { User } = require('../models');

// 유틸리티 import
const { ok, err, errors } = require('../utils/responseHelpers');
const asyncHandler = require('../utils/asyncHandler');
const { createRequestLog, createResponseLog, log } = require('../utils/logger');

/**
 * [GET] /settings
 * 사용자의 모든 설정 조회 (고정 + 커스텀)
 */
exports.getSettings = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_USER_SETTINGS');
    log('info', requestLog);

    const settings = await settingsService.getAllUserSettings(req.user.userId);

    const responseLog = createResponseLog(res, 200, '사용자 설정 조회 성공');
    log('info', responseLog);

    ok(res, { settings });
});

/**
 * [GET] /settings/core
 * 사용자의 핵심 설정만 조회 (UserSettings 테이블)
 */
exports.getCoreSettings = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CORE_SETTINGS');
    log('info', requestLog);

    const coreSettings = await settingsService.getCoreSettings(req.user.userId);

    const responseLog = createResponseLog(res, 200, '핵심 설정 조회 성공');
    log('info', responseLog);

    ok(res, { coreSettings });
});

/**
 * [GET] /settings/custom
 * 사용자의 커스텀 설정만 조회 (UserCustomSettings 테이블)
 */
exports.getCustomSettings = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CUSTOM_SETTINGS');
    log('info', requestLog);

    const customSettings = await settingsService.getCustomSettings(req.user.userId);

    const responseLog = createResponseLog(res, 200, '커스텀 설정 조회 성공');
    log('info', responseLog);

    ok(res, { customSettings });
});

/**
 * [PUT] /settings/core
 * 핵심 설정 업데이트 (UserSettings 테이블)
 */
exports.updateCoreSettings = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'UPDATE_CORE_SETTINGS');
    log('info', requestLog);

    const updateData = req.body;
    const userId = req.user.userId;

    // 입력 검증
    const allowedFields = [
        'notification_enabled', 'motion_sensitivity', 'auto_recording',
        'recording_quality', 'storage_days', 'dark_mode', 'language', 'timezone'
    ];

    const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
        return err(res, errors.INVALID_INPUT, `유효하지 않은 필드: ${invalidFields.join(', ')}`);
    }

    // 엔터프라이즈: 구독 등급에 따라 최대 화질 제한
    if (updateData && updateData.recording_quality) {
        const user = await User.findByPk(userId);
        const tier = user?.subscription_tier || 'free';
        const maxByTier = { free: '720p', pro: '1080p', premium: '4K' };
        const order = ['480p', '720p', '1080p', '4K'];
        const desired = updateData.recording_quality;
        const maxAllowed = maxByTier[tier] || '720p';
        if (order.indexOf(desired) > order.indexOf(maxAllowed)) {
            return err(res, errors.FORBIDDEN, `현재 구독 등급(${tier})에서는 ${maxAllowed} 까지만 설정 가능합니다.`);
        }
    }

    const updatedSettings = await settingsService.updateCoreSettings(userId, updateData);

    const responseLog = createResponseLog(res, 200, '핵심 설정 업데이트 성공');
    log('info', responseLog);

    ok(res, {
        coreSettings: updatedSettings,
        message: '핵심 설정이 성공적으로 업데이트되었습니다.'
    });
});

/**
 * [PUT] /settings/custom/:key
 * 특정 커스텀 설정 업데이트
 */
exports.updateCustomSetting = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'UPDATE_CUSTOM_SETTING');
    log('info', requestLog);

    const { key } = req.params;
    const { value, dataType } = req.body;
    const userId = req.user.userId;

    // 입력 검증
    if (!key) {
        return err(res, errors.INVALID_INPUT, '설정 키가 필요합니다.');
    }

    if (value === undefined) {
        return err(res, errors.INVALID_INPUT, '설정 값이 필요합니다.');
    }

    const allowedDataTypes = ['string', 'number', 'boolean', 'json'];
    if (dataType && !allowedDataTypes.includes(dataType)) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 데이터 타입입니다.');
    }

    const updatedSetting = await settingsService.updateCustomSetting(
        userId,
        key,
        value,
        dataType || 'string'
    );

    const responseLog = createResponseLog(res, 200, '커스텀 설정 업데이트 성공');
    log('info', responseLog);

    ok(res, {
        customSetting: updatedSetting,
        message: `'${key}' 설정이 성공적으로 업데이트되었습니다.`
    });
});

/**
 * [DELETE] /settings/custom/:key
 * 특정 커스텀 설정 삭제
 */
exports.deleteCustomSetting = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'DELETE_CUSTOM_SETTING');
    log('info', requestLog);

    const { key } = req.params;
    const userId = req.user.userId;

    // 입력 검증
    if (!key) {
        return err(res, errors.INVALID_INPUT, '설정 키가 필요합니다.');
    }

    const result = await settingsService.deleteCustomSetting(userId, key);

    const responseLog = createResponseLog(res, 200, '커스텀 설정 삭제 성공');
    log('info', responseLog);

    ok(res, {
        deleted: result,
        message: `'${key}' 설정이 성공적으로 삭제되었습니다.`
    });
});

/**
 * [POST] /settings/reset
 * 사용자 설정을 기본값으로 초기화
 */
exports.resetSettings = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'RESET_USER_SETTINGS');
    log('info', requestLog);

    const userId = req.user.userId;
    const { resetType } = req.body; // 'core', 'custom', 'all'

    if (!['core', 'custom', 'all'].includes(resetType)) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 초기화 타입입니다.');
    }

    const result = await settingsService.resetUserSettings(userId, resetType);

    const responseLog = createResponseLog(res, 200, '설정 초기화 성공');
    log('info', responseLog);

    ok(res, {
        result,
        message: `${resetType === 'all' ? '모든' : resetType === 'core' ? '핵심' : '커스텀'} 설정이 초기화되었습니다.`
    });
});
// SettingsController.js
const settingsService = require('../service/SettingsService');

/**
 * 설명: 사용자 설정 조회
 * 입력: req.user.userId
 * 출력: 설정 정보 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getSettings = async (req, res) => {
    try {
        const settings = await settingsService.getSettingsByUserId(req.user.userId);

        res.json({
            ok: true,
            data: { settings }
        });
    } catch (error) {
        console.error('설정 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '설정을 조회할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 사용자 설정 업데이트
 * 입력: req.body, req.user.userId
 * 출력: 업데이트된 설정 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 400, 500 에러
 */
exports.updateSettings = async (req, res) => {
    try {
        const updateData = req.body;

        // 설정 데이터 검증
        await settingsService.validateSettings(updateData);

        const settings = await settingsService.updateSettings(req.user.userId, updateData);

        res.json({
            ok: true,
            data: { settings },
            message: '설정이 성공적으로 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('설정 업데이트 에러:', error.message);

        if (error.message.includes('설정 검증 실패')) {
            res.status(400).json({
                ok: false,
                error: {
                    code: 'E_VALIDATION',
                    message: error.message
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '설정을 업데이트할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 특정 설정 값 조회
 * 입력: req.params.key, req.user.userId
 * 출력: 설정 값 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getSettingValue = async (req, res) => {
    try {
        const { key } = req.params;
        const value = await settingsService.getSettingValue(req.user.userId, key);

        res.json({
            ok: true,
            data: { key, value }
        });
    } catch (error) {
        console.error('설정 값 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '설정 값을 조회할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 특정 설정 값 업데이트
 * 입력: req.params.key, req.body.value, req.user.userId
 * 출력: 업데이트된 설정 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 400, 500 에러
 */
exports.updateSettingValue = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const settings = await settingsService.updateSettingValue(req.user.userId, key, value);

        res.json({
            ok: true,
            data: { settings },
            message: '설정 값이 성공적으로 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('설정 값 업데이트 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '설정 값을 업데이트할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 설정 초기화 (기본값으로 복원)
 * 입력: req.user.userId
 * 출력: 초기화된 설정 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 500 에러
 */
exports.resetSettings = async (req, res) => {
    try {
        const settings = await settingsService.resetSettings(req.user.userId);

        res.json({
            ok: true,
            data: { settings },
            message: '설정이 기본값으로 초기화되었습니다.'
        });
    } catch (error) {
        console.error('설정 초기화 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '설정을 초기화할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 카메라별 설정 조회
 * 입력: req.params.cameraId, req.user.userId
 * 출력: 카메라별 설정 정보 JSON
 * 부작용: 없음
 * 예외: 403, 500 에러
 */
exports.getCameraSettings = async (req, res) => {
    try {
        const { cameraId } = req.params;
        const cameraSettings = await settingsService.getCameraSettings(req.user.userId, cameraId);

        res.json({
            ok: true,
            data: { cameraSettings }
        });
    } catch (error) {
        console.error('카메라 설정 조회 에러:', error.message);

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
                    message: '카메라 설정을 조회할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 카메라별 설정 업데이트
 * 입력: req.params.cameraId, req.body, req.user.userId
 * 출력: 업데이트된 카메라별 설정 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 400, 403, 500 에러
 */
exports.updateCameraSettings = async (req, res) => {
    try {
        const { cameraId } = req.params;
        const updateData = req.body;

        // 설정 데이터 검증
        await settingsService.validateSettings(updateData);

        const cameraSettings = await settingsService.updateCameraSettings(req.user.userId, cameraId, updateData);

        res.json({
            ok: true,
            data: { cameraSettings },
            message: '카메라 설정이 성공적으로 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('카메라 설정 업데이트 에러:', error.message);

        if (error.message.includes('설정 검증 실패')) {
            res.status(400).json({
                ok: false,
                error: {
                    code: 'E_VALIDATION',
                    message: error.message
                }
            });
        } else if (error.message === '카메라에 접근 권한이 없습니다.') {
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
                    message: '카메라 설정을 업데이트할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 설정 내보내기 (백업용)
 * 입력: req.user.userId
 * 출력: 설정 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.exportSettings = async (req, res) => {
    try {
        const exportedData = await settingsService.exportSettings(req.user.userId);

        res.json({
            ok: true,
            data: { exportedData }
        });
    } catch (error) {
        console.error('설정 내보내기 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '설정을 내보낼 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 설정 가져오기 (복원용)
 * 입력: req.body.settingsData, req.user.userId
 * 출력: 가져온 설정 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 400, 500 에러
 */
exports.importSettings = async (req, res) => {
    try {
        const { settingsData } = req.body;

        const importedData = await settingsService.importSettings(req.user.userId, settingsData);

        res.json({
            ok: true,
            data: { importedData },
            message: '설정이 성공적으로 가져와졌습니다.'
        });
    } catch (error) {
        console.error('설정 가져오기 에러:', error.message);

        if (error.message.includes('설정 검증 실패')) {
            res.status(400).json({
                ok: false,
                error: {
                    code: 'E_VALIDATION',
                    message: error.message
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '설정을 가져올 수 없습니다.'
                }
            });
        }
    }
};

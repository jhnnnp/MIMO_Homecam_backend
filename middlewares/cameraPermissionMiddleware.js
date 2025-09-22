const cameraService = require('../service/CameraService');
const { err, errors } = require('../utils/responseHelpers');
const { createRequestLog, createResponseLog, log } = require('../utils/logger');

/**
 * 카메라 접근 권한 확인 미들웨어
 * @param {Array} requiredLevels - 필요한 권한 레벨 배열 ['viewer', 'controller', 'admin']
 */
const checkCameraPermission = (requiredLevels = ['viewer']) => {
    return async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            // 카메라 ID 검증
            if (!id || isNaN(parseInt(id))) {
                const errorLog = createResponseLog(res, 400, '유효하지 않은 카메라 ID');
                log('error', errorLog);
                return err(res, errors.INVALID_INPUT, '유효하지 않은 카메라 ID입니다.');
            }

            // 사용자의 카메라 접근 권한 확인
            const permission = await cameraService.getUserCameraPermission(parseInt(id), userId);

            if (!permission) {
                const errorLog = createResponseLog(res, 403, '카메라 접근 권한 없음');
                log('warn', errorLog);
                return err(res, errors.FORBIDDEN, '해당 카메라에 대한 접근 권한이 없습니다.');
            }

            // 권한 레벨 확인
            const permissionLevels = {
                'viewer': 1,
                'controller': 2,
                'admin': 3
            };

            const userPermissionLevel = permissionLevels[permission.permission_level] || 0;
            const requiredPermissionLevel = Math.min(...requiredLevels.map(level => permissionLevels[level] || 999));

            if (userPermissionLevel < requiredPermissionLevel) {
                const errorLog = createResponseLog(res, 403, '권한 레벨 부족');
                log('warn', errorLog);
                return err(res, errors.FORBIDDEN, `해당 작업을 수행하기 위해서는 ${requiredLevels.join(' 또는 ')} 권한이 필요합니다.`);
            }

            // 권한 정보를 req 객체에 추가하여 다음 미들웨어에서 사용 가능
            req.cameraPermission = permission;

            const requestLog = createRequestLog(req, 'CAMERA_PERMISSION_GRANTED', {
                cameraId: id,
                permissionLevel: permission.permission_level,
                accessType: permission.access_type
            });
            log('info', requestLog);

            next();
        } catch (error) {
            const errorLog = createResponseLog(res, 500, '권한 확인 중 오류 발생');
            log('error', { ...errorLog, error: error.message, stack: error.stack });
            return err(res, errors.INTERNAL_SERVER_ERROR, '권한 확인 중 오류가 발생했습니다.');
        }
    };
};

/**
 * 카메라 소유자 권한만 확인하는 미들웨어
 */
const checkCameraOwnership = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // 카메라 ID 검증
        if (!id || isNaN(parseInt(id))) {
            return err(res, errors.INVALID_INPUT, '유효하지 않은 카메라 ID입니다.');
        }

        // 소유자 권한 확인
        const permission = await cameraService.getUserCameraPermission(parseInt(id), userId);

        if (!permission || permission.access_type !== 'owner') {
            const errorLog = createResponseLog(res, 403, '카메라 소유자 권한 없음');
            log('warn', errorLog);
            return err(res, errors.FORBIDDEN, '해당 카메라의 소유자만 이 작업을 수행할 수 있습니다.');
        }

        req.cameraPermission = permission;
        next();
    } catch (error) {
        const errorLog = createResponseLog(res, 500, '소유자 권한 확인 중 오류 발생');
        log('error', { ...errorLog, error: error.message });
        return err(res, errors.INTERNAL_SERVER_ERROR, '권한 확인 중 오류가 발생했습니다.');
    }
};

/**
 * 권한 레벨별 미들웨어 팩토리 함수들
 */
const requireViewerAccess = () => checkCameraPermission(['viewer', 'controller', 'admin']);
const requireControllerAccess = () => checkCameraPermission(['controller', 'admin']);
const requireAdminAccess = () => checkCameraPermission(['admin']);

module.exports = {
    checkCameraPermission,
    checkCameraOwnership,
    requireViewerAccess,
    requireControllerAccess,
    requireAdminAccess
};







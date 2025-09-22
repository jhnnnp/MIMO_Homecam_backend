// CameraController.js
const cameraService = require('../service/CameraService');

// 유틸리티 import
const { ok, err, errors } = require('../utils/responseHelpers');
const { parsePaging } = require('../utils/validationHelpers');
const asyncHandler = require('../utils/asyncHandler');
const { createRequestLog, createResponseLog, log } = require('../utils/logger');
const connectionManager = require('../utils/connectionManager');
const { buildLiveStreamUrl, buildCameraStreamUrl, getDefaultMediaSettings } = require('../utils/mediaUrlBuilder');

/**
 * [GET] /cameras
 * 사용자가 접근 가능한 모든 카메라 목록 조회 (소유 + 공유받은)
 */
exports.getCameras = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_ACCESSIBLE_CAMERAS');
    log('info', requestLog);

    // 소유 + 공유받은 카메라 모두 조회
    const cameras = await cameraService.getAccessibleCamerasByUserId(req.user.userId);

    const responseLog = createResponseLog(res, 200, '접근 가능한 카메라 목록 조회 성공');
    log('info', responseLog);

    ok(res, {
        cameras,
        total: cameras.length,
        owned: cameras.filter(c => c.access_type === 'owner').length,
        shared: cameras.filter(c => c.access_type === 'shared').length
    });
});

/**
 * [GET] /cameras/owned
 * 사용자가 소유한 카메라만 조회 (기존 기능 유지)
 */
exports.getOwnedCameras = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_OWNED_CAMERAS');
    log('info', requestLog);

    const cameras = await cameraService.getCamerasByUserId(req.user.userId);

    const responseLog = createResponseLog(res, 200, '소유 카메라 목록 조회 성공');
    log('info', responseLog);

    ok(res, { cameras });
});

/**
 * [GET] /cameras/count
 * 사용자의 등록된 카메라 수 조회
 */
exports.getCameraCount = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CAMERA_COUNT');
    log('info', requestLog);

    const count = await cameraService.getCameraCountByUserId(req.user.userId);

    const responseLog = createResponseLog(res, 200, '카메라 수 조회 성공');
    log('info', responseLog);

    ok(res, { count, hasRegisteredCameras: count > 0 });
});

/**
 * [GET] /cameras/:id
 * 특정 카메라 상세 정보 조회
 */
exports.getCameraById = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CAMERA_BY_ID');
    log('info', requestLog);

    const { id } = req.params;
    const camera = await cameraService.getCameraById(id, req.user.userId);

    const responseLog = createResponseLog(res, 200, '카메라 정보 조회 성공');
    log('info', responseLog);

    ok(res, { camera });
});

/**
 * [POST] /cameras
 * 새 카메라 등록
 */
exports.createCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'CREATE_CAMERA');
    log('info', requestLog);

    const cameraData = req.body;
    const camera = await cameraService.createCamera(cameraData, req.user.userId);

    const responseLog = createResponseLog(res, 201, '카메라 등록 성공');
    log('info', responseLog);

    ok(res, {
        camera,
        message: '카메라가 성공적으로 등록되었습니다.'
    }, null, 201);
});

/**
 * [PUT] /cameras/:id
 * 카메라 정보 업데이트
 */
exports.updateCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'UPDATE_CAMERA');
    log('info', requestLog);

    const { id } = req.params;
    const updateData = req.body;
    const camera = await cameraService.updateCamera(id, updateData, req.user.userId);

    const responseLog = createResponseLog(res, 200, '카메라 정보 업데이트 성공');
    log('info', responseLog);

    ok(res, {
        camera,
        message: '카메라 정보가 성공적으로 업데이트되었습니다.'
    });
});

/**
 * [DELETE] /cameras/:id
 * 카메라 삭제
 */
exports.deleteCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'DELETE_CAMERA');
    log('info', requestLog);

    const { id } = req.params;
    await cameraService.deleteCamera(id, req.user.userId);

    const responseLog = createResponseLog(res, 200, '카메라 삭제 성공');
    log('info', responseLog);

    ok(res, {
        message: '카메라가 성공적으로 삭제되었습니다.'
    });
});

/**
 * [GET] /cameras/:id/live-stream
 * 카메라 라이브 스트림 정보 조회
 */
exports.getLiveStream = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_LIVE_STREAM');
    log('info', requestLog);

    const { id } = req.params;
    const viewerId = req.user.userId;

    // 카메라 접근 권한 확인
    const camera = await cameraService.getCameraById(id, req.user.userId);

    // 미디어 서버 URL 생성
    const streamUrl = buildLiveStreamUrl(id, viewerId);
    const defaultSettings = getDefaultMediaSettings();

    const responseLog = createResponseLog(res, 200, '라이브 스트림 정보 조회 성공');
    log('info', responseLog);

    ok(res, {
        cameraId: id,
        cameraName: camera.name,
        streamUrl,
        settings: defaultSettings,
        viewerId
    });
});

/**
 * [POST] /cameras/register
 * 홈캠 등록 (실시간 스트리밍용)
 */
exports.registerCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'REGISTER_CAMERA');
    log('info', requestLog);

    const { cameraId, cameraName, connectionId } = req.body;
    const userId = req.user.userId;

    if (!cameraId || !cameraName) {
        const responseLog = createResponseLog(res, 400, '카메라 ID와 이름이 필요합니다.');
        log('warn', responseLog);
        return errors.validation(res, '카메라 ID와 이름이 필요합니다.');
    }

    // 카메라 데이터 준비
    const cameraData = {
        id: cameraId,
        name: cameraName,
        userId: userId,
        status: 'ready',
        createdAt: new Date()
    };

    // DB에 카메라 영속화 (device_id 기준 upsert)
    let dbCamera = null;
    try {
        dbCamera = await cameraService.createOrUpdateCameraByDeviceId(String(cameraId), cameraName, userId, 'online');
    } catch (e) {
        // DB 저장 실패는 흐름을 막지 않되 로그만 남김
        log('warn', { message: '카메라 DB 저장 실패', error: e.message });
    }

    // Redis 기반 연결 관리자 사용 (PIN 코드 = connectionId)
    let finalConnectionId = connectionId;
    if (!finalConnectionId) {
        // 6자리 PIN 코드 생성 + 고유성 보장
        const generateSixDigitPin = () => String(Math.floor(100000 + Math.random() * 900000));
        finalConnectionId = await connectionManager.generateUniqueConnectionId(generateSixDigitPin);
    }
    // 지정된/생성된 PIN 코드로 등록
    await connectionManager.registerCameraWithId(cameraData, finalConnectionId);

    // 퍼블리셔용 미디어 서버 URL 제공
    const publisherUrl = buildCameraStreamUrl(String(cameraId));

    const responseLog = createResponseLog(res, 201, '홈캠 등록 성공');
    log('info', responseLog);

    ok(res, {
        connectionId: finalConnectionId,
        pinCode: finalConnectionId,
        cameraId,
        cameraName,
        dbCameraId: dbCamera ? dbCamera.id : undefined,
        media: {
            publisherUrl
        },
        message: '홈캠이 성공적으로 등록되었습니다.'
    }, null, 201);
});

/**
 * [GET] /cameras/search/:connectionId
 * 연결 ID로 홈캠 검색
 */
exports.searchCameraByConnectionId = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'SEARCH_CAMERA');
    log('info', requestLog);

    const { connectionId } = req.params;

    // Redis 기반 연결 관리자에서 카메라 정보 검색
    const cameraData = await connectionManager.getCamera(connectionId);

    if (!cameraData) {
        const responseLog = createResponseLog(res, 404, '해당 홈캠을 찾을 수 없습니다.');
        log('warn', responseLog);
        return errors.notFound(res, '해당 홈캠을 찾을 수 없습니다.');
    }

    const cameraId = cameraData.id ?? cameraData.cameraId;
    const cameraName = cameraData.name ?? cameraData.cameraName;

    const responseLog = createResponseLog(res, 200, '홈캠 검색 성공');
    log('info', responseLog);

    ok(res, {
        cameraId,
        cameraName,
        connectionId,
        status: cameraData.status
    });
});





/**
 * [GET] /cameras/search/pin/:pinCode  
 * PIN 코드로 홈캠 검색
 */
exports.searchCameraByPinCode = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'SEARCH_CAMERA_BY_PIN');
    log('info', requestLog);

    const { pinCode } = req.params;

    // PIN 코드로 카메라 검색 (connectionManager에서 PIN 코드를 connectionId로 사용)
    const cameraData = await connectionManager.getCamera(pinCode);

    if (!cameraData) {
        const responseLog = createResponseLog(res, 404, '해당 PIN 코드의 홈캠을 찾을 수 없습니다.');
        log('warn', responseLog);
        return errors.notFound(res, '해당 PIN 코드의 홈캠을 찾을 수 없습니다.');
    }

    const cameraId = cameraData.id ?? cameraData.cameraId;
    const cameraName = cameraData.name ?? cameraData.cameraName;

    const responseLog = createResponseLog(res, 200, 'PIN 코드로 홈캠 검색 성공');
    log('info', responseLog);

    ok(res, {
        cameraId,
        cameraName,
        pinCode,
        status: cameraData.status
    });
});

/**
 * [POST] /cameras/connect/pin/:pinCode
 * PIN 코드로 홈캠에 연결
 */
exports.connectToCameraByPinCode = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'CONNECT_TO_CAMERA_BY_PIN');
    log('info', requestLog);

    const { pinCode } = req.params;
    const viewerId = req.user.userId;

    // PIN 코드로 카메라 검색
    const cameraData = await connectionManager.getCamera(pinCode);

    if (!cameraData) {
        const responseLog = createResponseLog(res, 404, 'PIN 코드가 올바르지 않거나 만료되었습니다.');
        log('warn', responseLog);
        return errors.notFound(res, 'PIN 코드가 올바르지 않거나 만료되었습니다.');
    }

    // 연결 등록 (기존 임시 연결)
    await connectionManager.connectViewer(pinCode, viewerId);

    // 뷰어용 미디어 서버 URL 제공
    const cameraId = String((cameraData.id ?? cameraData.cameraId));
    const cameraName = cameraData.name ?? cameraData.cameraName;
    const viewerUrl = buildLiveStreamUrl(cameraId, String(viewerId));

    // ==================== 🆕 영구 등록 로직 추가 ====================
    
    try {
        // 1. 데이터베이스에서 실제 카메라 찾기
        const { Camera, DevicePermissions } = require('../models');
        const dbCamera = await Camera.findOne({
            where: { device_id: cameraId }
        });

        if (dbCamera) {
            // 2. 이미 권한이 있는지 확인
            const existingPermission = await DevicePermissions.findOne({
                where: { 
                    camera_id: dbCamera.id, 
                    user_id: viewerId 
                }
            });

            if (!existingPermission) {
                // 3. 새로운 권한 생성 (PIN 연결은 기본 'viewer' 권한)
                await DevicePermissions.create({
                    camera_id: dbCamera.id,
                    user_id: viewerId,
                    permission_level: 'viewer',
                    granted_by: dbCamera.owner_id, // 홈캠 소유자가 부여한 것으로 기록
                    granted_at: new Date(),
                    expires_at: null, // 영구 권한
                    is_active: true,
                    notes: `PIN 코드 ${pinCode}를 통한 자동 등록`
                });

                log('info', {
                    message: 'PIN 연결 시 자동 권한 생성 완료',
                    cameraId: dbCamera.id,
                    viewerId,
                    permissionLevel: 'viewer'
                });
            } else {
                // 기존 권한이 비활성화되어 있다면 활성화
                if (!existingPermission.is_active) {
                    await existingPermission.update({
                        is_active: true,
                        granted_at: new Date(),
                        notes: `PIN 코드 ${pinCode}를 통한 재연결`
                    });

                    log('info', {
                        message: 'PIN 연결 시 기존 권한 재활성화 완료',
                        cameraId: dbCamera.id,
                        viewerId
                    });
                }
            }
        }
    } catch (permissionError) {
        // 권한 생성 실패해도 스트리밍은 계속 진행
        log('warn', {
            message: 'PIN 연결 시 권한 생성 실패 (스트리밍은 계속 진행)',
            error: permissionError.message,
            cameraId,
            viewerId
        });
    }

    // ==================== 영구 등록 로직 끝 ====================

    const responseLog = createResponseLog(res, 200, 'PIN 코드로 홈캠 연결 및 등록 성공');
    log('info', responseLog);

    ok(res, {
        cameraId: cameraId,
        cameraName: cameraName,
        pinCode,
        viewerId,
        media: {
            viewerUrl
        },
        isRegisteredPermanently: true, // 영구 등록 완료 표시
        message: '홈캠에 성공적으로 연결되었으며 카메라 목록에 추가되었습니다.'
    });
});

/**
 * [POST] /cameras/:connectionId/connect
 * 홈캠에 연결
 */
exports.connectToCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'CONNECT_TO_CAMERA');
    log('info', requestLog);

    const { connectionId } = req.params;
    const viewerId = req.user.userId;

    // Redis 기반 연결 관리자에서 카메라 정보 검색
    const cameraData = await connectionManager.getCamera(connectionId);

    if (!cameraData) {
        const responseLog = createResponseLog(res, 404, '해당 홈캠을 찾을 수 없습니다.');
        log('warn', responseLog);
        return errors.notFound(res, '해당 홈캠을 찾을 수 없습니다.');
    }

    const cameraId = cameraData.id ?? cameraData.cameraId;
    const cameraName = cameraData.name ?? cameraData.cameraName;

    // 연결 정보 생성
    const connectionData = {
        cameraId: cameraId,
        cameraName: cameraName,
        connectionId,
        viewerId,
        connectedAt: new Date(),
        status: 'connected'
    };

    // Redis 기반 연결 관리자에 뷰어 연결 등록
    await connectionManager.registerViewerConnection(connectionId, viewerId, connectionData);

    // 뷰어용 미디어 서버 URL 제공
    const viewerUrl = buildLiveStreamUrl(String(cameraId), String(viewerId));

    const responseLog = createResponseLog(res, 200, '홈캠 연결 성공');
    log('info', responseLog);

    ok(res, {
        connectionId,
        cameraId: cameraId,
        cameraName: cameraName,
        viewerId,
        media: {
            viewerUrl
        },
        message: '홈캠에 성공적으로 연결되었습니다.'
    });
});

/**
 * [POST] /cameras/:connectionId/disconnect
 * 홈캠 연결 해제
 */
exports.disconnectFromCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'DISCONNECT_FROM_CAMERA');
    log('info', requestLog);

    const { connectionId } = req.params;
    const viewerId = req.user.userId;

    // Redis 기반 연결 관리자에서 연결 정보 확인
    const connectionData = await connectionManager.getViewerConnection(connectionId, viewerId);

    if (!connectionData) {
        const responseLog = createResponseLog(res, 404, '연결 정보를 찾을 수 없습니다.');
        log('warn', responseLog);
        return errors.notFound(res, '연결 정보를 찾을 수 없습니다.');
    }

    // Redis 기반 연결 관리자에서 뷰어 연결 해제
    await connectionManager.unregisterViewerConnection(connectionId, viewerId);

    const responseLog = createResponseLog(res, 200, '홈캠 연결 해제 성공');
    log('info', responseLog);

    ok(res, {
        message: '홈캠 연결이 성공적으로 해제되었습니다.'
    });
});

/**
 * [GET] /cameras/:connectionId/viewers
 * 카메라에 연결된 뷰어 목록 조회
 */
exports.getCameraViewers = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CAMERA_VIEWERS');
    log('info', requestLog);

    const { connectionId } = req.params;

    // 카메라 존재 확인
    const cameraData = await connectionManager.getCamera(connectionId);
    if (!cameraData) {
        const responseLog = createResponseLog(res, 404, '해당 홈캠을 찾을 수 없습니다.');
        log('warn', responseLog);
        return errors.notFound(res, '해당 홈캠을 찾을 수 없습니다.');
    }

    // 카메라 소유자 확인
    if (cameraData.userId !== req.user.userId) {
        const responseLog = createResponseLog(res, 403, '카메라에 대한 접근 권한이 없습니다.');
        log('warn', responseLog);
        return errors.forbidden(res, '카메라에 대한 접근 권한이 없습니다.');
    }

    // Redis 기반 연결 관리자에서 뷰어 연결 목록 조회
    const viewers = await connectionManager.getViewerConnections(connectionId);

    const responseLog = createResponseLog(res, 200, '뷰어 목록 조회 성공');
    log('info', responseLog);

    ok(res, {
        cameraId: cameraData.id,
        cameraName: cameraData.name,
        connectionId,
        viewers: viewers.map(viewer => ({
            viewerId: viewer.viewerId,
            connectedAt: viewer.connectedAt,
            status: viewer.status
        }))
    });
});



/**
 * [POST] /cameras/:id/heartbeat
 * 카메라 하트비트 업데이트
 */
exports.updateCameraHeartbeat = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'UPDATE_CAMERA_HEARTBEAT');
    log('info', requestLog);

    const { id } = req.params;
    const heartbeatData = req.body;

    // 카메라 존재 확인
    const camera = await cameraService.getCameraById(id, req.user.userId);
    if (!camera) {
        const responseLog = createResponseLog(res, 404, '카메라를 찾을 수 없습니다.');
        log('warn', responseLog);
        return errors.notFound(res, '카메라를 찾을 수 없습니다.');
    }

    // 하트비트 데이터 업데이트
    const updatedCamera = await cameraService.updateCamera(id, {
        lastSeen: new Date(),
        status: 'online',
        ...heartbeatData
    }, req.user.userId);

    const responseLog = createResponseLog(res, 200, '카메라 하트비트 업데이트 성공');
    log('info', responseLog);

    ok(res, {
        camera: updatedCamera,
        message: '하트비트가 성공적으로 업데이트되었습니다.'
    });
});

/**
 * [GET] /cameras/stats
 * 카메라 연결 통계 조회
 */
exports.getCameraStats = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CAMERA_STATS');
    log('info', requestLog);

    // Redis 기반 연결 관리자에서 통계 조회
    const stats = await connectionManager.getStats();

    const responseLog = createResponseLog(res, 200, '카메라 통계 조회 성공');
    log('info', responseLog);

    ok(res, stats);
});

/**
 * [DELETE] /cameras/:id
 * 카메라 삭제
 */
exports.deleteCamera = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'DELETE_CAMERA');
    log('info', requestLog);

    const { id } = req.params;
    const userId = req.user.userId;

    // 카메라 ID 검증
    if (!id || isNaN(parseInt(id))) {
        const errorLog = createResponseLog(res, 400, '유효하지 않은 카메라 ID');
        log('error', errorLog);
        return err(res, errors.INVALID_INPUT, '유효하지 않은 카메라 ID입니다.');
    }

    // 카메라 존재 여부 확인
    const existingCamera = await cameraService.getCameraById(parseInt(id), userId);
    if (!existingCamera) {
        const errorLog = createResponseLog(res, 404, '카메라를 찾을 수 없음');
        log('error', errorLog);
        return err(res, errors.NOT_FOUND, '삭제할 카메라를 찾을 수 없습니다.');
    }

    // 카메라 삭제
    const deletedCamera = await cameraService.deleteCameraById(parseInt(id), userId);

    const responseLog = createResponseLog(res, 200, '카메라 삭제 성공');
    log('info', responseLog);

    ok(res, {
        deletedCamera,
        message: `'${existingCamera.name}' 카메라가 성공적으로 삭제되었습니다.`
    });
});

// ==================== 카메라 공유 관련 API ====================

/**
 * [POST] /cameras/:id/share
 * 카메라 공유 권한 부여
 */
exports.shareCameraWithUser = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'SHARE_CAMERA');
    log('info', requestLog);

    const { id } = req.params;
    const { targetUserEmail, permissionLevel, expiresAt, notes } = req.body;
    const ownerId = req.user.userId;

    // 입력 검증
    if (!id || isNaN(parseInt(id))) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 카메라 ID입니다.');
    }

    if (!targetUserEmail) {
        return err(res, errors.INVALID_INPUT, '공유 대상 사용자 이메일이 필요합니다.');
    }

    if (!['viewer', 'controller', 'admin'].includes(permissionLevel)) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 권한 레벨입니다.');
    }

    // 대상 사용자 찾기
    const { User } = require('../models');
    const targetUser = await User.findOne({ where: { email: targetUserEmail } });

    if (!targetUser) {
        return err(res, errors.NOT_FOUND, '공유 대상 사용자를 찾을 수 없습니다.');
    }

    // 자기 자신에게 공유하는 것 방지
    if (targetUser.id === ownerId) {
        return err(res, errors.INVALID_INPUT, '자기 자신에게는 카메라를 공유할 수 없습니다.');
    }

    const options = {};
    if (expiresAt) {
        options.expires_at = new Date(expiresAt);
    }
    if (notes) {
        options.notes = notes;
    }

    // 권한 부여
    const permission = await cameraService.grantCameraPermission(
        parseInt(id),
        targetUser.id,
        permissionLevel,
        ownerId,
        options
    );

    const responseLog = createResponseLog(res, 201, '카메라 공유 성공');
    log('info', responseLog);

    ok(res, {
        permission,
        message: `${targetUser.name}님에게 카메라가 성공적으로 공유되었습니다.`
    });
});

/**
 * [DELETE] /cameras/:id/share/:userId
 * 카메라 공유 권한 해제
 */
exports.revokeCameraShare = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'REVOKE_CAMERA_SHARE');
    log('info', requestLog);

    const { id, userId } = req.params;
    const ownerId = req.user.userId;

    // 입력 검증
    if (!id || isNaN(parseInt(id)) || !userId || isNaN(parseInt(userId))) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 ID입니다.');
    }

    // 권한 해제
    const result = await cameraService.revokeCameraPermission(
        parseInt(id),
        parseInt(userId),
        ownerId
    );

    const responseLog = createResponseLog(res, 200, '카메라 공유 해제 성공');
    log('info', responseLog);

    ok(res, result);
});

/**
 * [GET] /cameras/:id/shared-users
 * 카메라가 공유된 사용자 목록 조회
 */
exports.getCameraSharedUsers = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CAMERA_SHARED_USERS');
    log('info', requestLog);

    const { id } = req.params;
    const ownerId = req.user.userId;

    // 입력 검증
    if (!id || isNaN(parseInt(id))) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 카메라 ID입니다.');
    }

    // 공유된 사용자 목록 조회
    const sharedUsers = await cameraService.getCameraSharedUsers(parseInt(id), ownerId);

    const responseLog = createResponseLog(res, 200, '공유 사용자 목록 조회 성공');
    log('info', responseLog);

    ok(res, {
        sharedUsers,
        total: sharedUsers.length
    });
});

/**
 * [GET] /cameras/:id/permission
 * 사용자의 특정 카메라에 대한 권한 확인
 */
exports.getUserCameraPermission = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_USER_CAMERA_PERMISSION');
    log('info', requestLog);

    const { id } = req.params;
    const userId = req.user.userId;

    // 입력 검증
    if (!id || isNaN(parseInt(id))) {
        return err(res, errors.INVALID_INPUT, '유효하지 않은 카메라 ID입니다.');
    }

    // 사용자 권한 확인
    const permission = await cameraService.getUserCameraPermission(parseInt(id), userId);

    if (!permission) {
        return err(res, errors.FORBIDDEN, '해당 카메라에 대한 접근 권한이 없습니다.');
    }

    const responseLog = createResponseLog(res, 200, '사용자 권한 확인 성공');
    log('info', responseLog);

    ok(res, { permission });
});

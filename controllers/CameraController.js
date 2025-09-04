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
 * 사용자의 모든 카메라 목록 조회
 */
exports.getCameras = asyncHandler(async (req, res) => {
    const requestLog = createRequestLog(req, 'GET_CAMERAS');
    log('info', requestLog);

    const cameras = await cameraService.getCamerasByUserId(req.user.userId);

    const responseLog = createResponseLog(res, 200, '카메라 목록 조회 성공');
    log('info', responseLog);

    ok(res, { cameras });
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

    // Redis 기반 연결 관리자 사용 (connectionId가 있으면 사용, 없으면 생성)
    const finalConnectionId = connectionId || await connectionManager.registerCamera(cameraData);

    if (connectionId) {
        // connectionId가 제공된 경우 직접 등록
        await connectionManager.registerCameraWithId(cameraData, connectionId);
    }

    // 퍼블리셔용 미디어 서버 URL 제공
    const publisherUrl = buildCameraStreamUrl(String(cameraId));

    const responseLog = createResponseLog(res, 201, '홈캠 등록 성공');
    log('info', responseLog);

    ok(res, {
        connectionId: finalConnectionId,
        cameraId,
        cameraName,
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

    // 연결 등록
    await connectionManager.connectViewer(pinCode, viewerId);

    // 뷰어용 미디어 서버 URL 제공
    const cameraId = String((cameraData.id ?? cameraData.cameraId));
    const cameraName = cameraData.name ?? cameraData.cameraName;
    const viewerUrl = buildLiveStreamUrl(cameraId, String(viewerId));

    const responseLog = createResponseLog(res, 200, 'PIN 코드로 홈캠 연결 성공');
    log('info', responseLog);

    ok(res, {
        cameraId: cameraId,
        cameraName: cameraName,
        pinCode,
        viewerId,
        media: {
            viewerUrl
        },
        message: '홈캠에 성공적으로 연결되었습니다.'
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

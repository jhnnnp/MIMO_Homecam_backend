// CameraController.js
const cameraService = require('../service/CameraService');

/**
 * 설명: 사용자의 모든 카메라 목록 조회
 * 입력: req.user.userId
 * 출력: 카메라 목록 JSON
 * 부작용: 없음
 * 예외: 500 에러
 */
exports.getCameras = async (req, res) => {
    try {
        const cameras = await cameraService.getCamerasByUserId(req.user.userId);

        res.json({
            ok: true,
            data: { cameras }
        });
    } catch (error) {
        console.error('카메라 목록 조회 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '카메라 목록을 조회할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 특정 카메라 상세 정보 조회
 * 입력: req.params.id, req.user.userId
 * 출력: 카메라 정보 JSON
 * 부작용: 없음
 * 예외: 404, 500 에러
 */
exports.getCameraById = async (req, res) => {
    try {
        const { id } = req.params;
        const camera = await cameraService.getCameraById(id, req.user.userId);

        res.json({
            ok: true,
            data: { camera }
        });
    } catch (error) {
        console.error('카메라 조회 에러:', error.message);

        if (error.message === '카메라를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '카메라를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '카메라 정보를 조회할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 새 카메라 등록
 * 입력: req.body, req.user.userId
 * 출력: 생성된 카메라 정보 JSON
 * 부작용: DB 저장
 * 예외: 400, 500 에러
 */
exports.createCamera = async (req, res) => {
    try {
        const cameraData = req.body;
        const camera = await cameraService.createCamera(cameraData, req.user.userId);

        res.status(201).json({
            ok: true,
            data: { camera },
            message: '카메라가 성공적으로 등록되었습니다.'
        });
    } catch (error) {
        console.error('카메라 생성 에러:', error.message);
        res.status(500).json({
            ok: false,
            error: {
                code: 'E_DATABASE_ERROR',
                message: '카메라를 등록할 수 없습니다.'
            }
        });
    }
};

/**
 * 설명: 카메라 정보 업데이트
 * 입력: req.params.id, req.body, req.user.userId
 * 출력: 업데이트된 카메라 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 404, 500 에러
 */
exports.updateCamera = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const camera = await cameraService.updateCamera(id, updateData, req.user.userId);

        res.json({
            ok: true,
            data: { camera },
            message: '카메라 정보가 성공적으로 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('카메라 업데이트 에러:', error.message);

        if (error.message === '카메라를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '카메라를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '카메라 정보를 업데이트할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 카메라 삭제
 * 입력: req.params.id, req.user.userId
 * 출력: 삭제 성공 메시지
 * 부작용: DB 삭제
 * 예외: 404, 500 에러
 */
exports.deleteCamera = async (req, res) => {
    try {
        const { id } = req.params;
        await cameraService.deleteCamera(id, req.user.userId);

        res.json({
            ok: true,
            message: '카메라가 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('카메라 삭제 에러:', error.message);

        if (error.message === '카메라를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '카메라를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '카메라를 삭제할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 카메라 하트비트 업데이트
 * 입력: req.params.id, req.body.status
 * 출력: 업데이트된 카메라 정보 JSON
 * 부작용: DB 업데이트
 * 예외: 404, 500 에러
 */
exports.updateCameraHeartbeat = async (req, res) => {
    try {
        const { id } = req.params;
        const { status = 'online' } = req.body;

        const camera = await cameraService.updateCameraStatus(id, status);

        res.json({
            ok: true,
            data: { camera },
            message: '카메라 상태가 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('카메라 하트비트 에러:', error.message);

        if (error.message === '카메라를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '카메라를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '카메라 상태를 업데이트할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 카메라 통계 정보 조회
 * 입력: req.params.id, req.user.userId
 * 출력: 카메라 통계 정보 JSON
 * 부작용: 없음
 * 예외: 404, 500 에러
 */
exports.getCameraStats = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await cameraService.getCameraStats(id, req.user.userId);

        res.json({
            ok: true,
            data: { stats }
        });
    } catch (error) {
        console.error('카메라 통계 조회 에러:', error.message);

        if (error.message === '카메라를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '카메라를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '카메라 통계를 조회할 수 없습니다.'
                }
            });
        }
    }
};

/**
 * 설명: 라이브 스트림 정보 조회 (WebRTC 시그널링용)
 * 입력: req.params.id, req.user.userId
 * 출력: 스트림 정보 JSON
 * 부작용: 없음
 * 예외: 404, 500 에러
 */
exports.getLiveStream = async (req, res) => {
    try {
        const { id } = req.params;
        const camera = await cameraService.getCameraById(id, req.user.userId);

        // 미디어 서버에서 스트림 정보 조회
        const mediaServer = global.mediaServer;
        const streamInfo = mediaServer ? mediaServer.getStreamInfo(camera.id) : null;

        // WebRTC 시그널링 정보 생성
        const stream = {
            cameraId: camera.id,
            cameraName: camera.name,
            status: camera.status,
            webrtcUrl: `ws://${process.env.MEDIA_SERVER_HOST || 'localhost'}:${process.env.MEDIA_SERVER_PORT || 4002}?cameraId=${camera.id}&type=viewer`,
            publisherUrl: `ws://${process.env.MEDIA_SERVER_HOST || 'localhost'}:${process.env.MEDIA_SERVER_PORT || 4002}?cameraId=${camera.id}&type=publisher`,
            protocol: 'webrtc',
            quality: 'high',
            isActive: camera.status === 'online',
            viewers: streamInfo ? streamInfo.viewers : 0,
            bitrate: 2048,
            frameRate: 30,
            resolution: '1080p',
            lastHeartbeat: camera.last_heartbeat,
            streamStatus: streamInfo ? streamInfo.status : 'offline'
        };

        res.json({
            ok: true,
            data: { stream }
        });
    } catch (error) {
        console.error('라이브 스트림 조회 에러:', error.message);

        if (error.message === '카메라를 찾을 수 없습니다.') {
            res.status(404).json({
                ok: false,
                error: {
                    code: 'E_NOT_FOUND',
                    message: '카메라를 찾을 수 없습니다.'
                }
            });
        } else {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'E_DATABASE_ERROR',
                    message: '라이브 스트림 정보를 조회할 수 없습니다.'
                }
            });
        }
    }
};

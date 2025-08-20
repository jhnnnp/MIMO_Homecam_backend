    /**
     * QR 코드 연결 처리
     */
    async handleQRConnection(userId, data) {
        try {
            const { connectionId, qrCode } = data;
            const qrCodeService = require("./service/qrCodeService");

            // QR 코드 스캔 처리
            const connectionInfo = await qrCodeService.handleQRScan(qrCode, `device_${userId}`, userId);

            this.sendToUser(userId, {
                type: "qr_connected",
                data: {
                    connectionId: connectionInfo.connectionId,
                    cameraId: connectionInfo.cameraId,
                    cameraName: connectionInfo.cameraName,
                    status: "connected"
                }
            });

            // 카메라 소유자에게 연결 알림
            const camera = await require("./models/Camera").findByPk(connectionInfo.cameraId);
            if (camera) {
                this.sendToUser(camera.user_id, {
                    type: "viewer_connected",
                    data: {
                        connectionId: connectionInfo.connectionId,
                        cameraId: connectionInfo.cameraId,
                        viewerId: userId
                    }
                });
            }

        } catch (error) {
            console.error("QR 연결 처리 실패:", error);
            this.sendToUser(userId, {
                type: "qr_connection_failed",
                data: { message: error.message }
            });
        }
    }

    /**
     * QR 코드 연결 해제 처리
     */
    async handleQRDisconnection(userId, data) {
        try {
            const { connectionId } = data;
            const qrCodeService = require("./service/qrCodeService");

            await qrCodeService.disconnectConnection(connectionId, userId);

            this.sendToUser(userId, {
                type: "qr_disconnected",
                data: { connectionId, message: "연결이 해제되었습니다." }
            });

        } catch (error) {
            console.error("QR 연결 해제 실패:", error);
            this.sendToUser(userId, {
                type: "qr_disconnection_failed",
                data: { message: error.message }
            });
        }
    }

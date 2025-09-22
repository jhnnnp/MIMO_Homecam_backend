const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// DB Health Check
router.get('/db', async (req, res) => {
    const start = Date.now();
    try {
        await sequelize.authenticate();
        const duration = Date.now() - start;
        return res.status(200).json({
            success: true,
            data: {
                status: 'connected',
                duration,
                database: sequelize.config.database,
                host: sequelize.config.host,
                dialect: sequelize.getDialect(),
                timestamp: new Date().toISOString(),
            },
            message: 'DB 연결 성공'
        });
    } catch (error) {
        const duration = Date.now() - start;
        return res.status(500).json({
            success: false,
            error: {
                code: 'DB_CONNECTION_ERROR',
                message: error.message,
            },
            data: {
                status: 'disconnected',
                duration,
                timestamp: new Date().toISOString(),
            }
        });
    }
});

module.exports = router;




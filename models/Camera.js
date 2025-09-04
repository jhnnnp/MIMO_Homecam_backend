const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Camera = sequelize.define('Camera', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    device_id: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING(100),
    },
    status: {
        type: DataTypes.ENUM('online', 'offline', 'error'),
        defaultValue: 'offline',
    },
    last_seen: { type: DataTypes.DATE },
    last_heartbeat: { type: DataTypes.DATE },
    firmware: {
        type: DataTypes.STRING(50),
    },
    settings: { type: DataTypes.JSON },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'Camera',
    timestamps: false,
});

module.exports = Camera;

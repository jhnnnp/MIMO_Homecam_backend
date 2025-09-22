const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserSettings = sequelize.define('UserSettings', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    notification_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    motion_sensitivity: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
        allowNull: false,
    },
    auto_recording: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    recording_quality: {
        type: DataTypes.ENUM('720p', '1080p', '4K'),
        defaultValue: '1080p',
        allowNull: false,
    },
    storage_days: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        allowNull: false,
    },
    dark_mode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    language: {
        type: DataTypes.STRING(10),
        defaultValue: 'ko',
        allowNull: false,
    },
    timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'Asia/Seoul',
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'UserSettings',
    timestamps: false,
});

module.exports = UserSettings;







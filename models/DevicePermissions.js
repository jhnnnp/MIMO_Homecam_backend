const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DevicePermissions = sequelize.define('DevicePermissions', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    camera_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    permission_level: {
        type: DataTypes.ENUM('viewer', 'controller', 'admin'),
        allowNull: false,
        defaultValue: 'viewer',
    },
    granted_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    granted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
    tableName: 'DevicePermissions',
    timestamps: false,
});

module.exports = DevicePermissions;

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
        type: DataTypes.STRING(50),
    },
    location: {
        type: DataTypes.STRING(100),
    },
    status: {
        type: DataTypes.ENUM('online', 'offline'),
        defaultValue: 'offline',
    },
    last_seen: {
        type: DataTypes.DATE,
    },
    firmware: {
        type: DataTypes.STRING(50),
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'Camera',
    timestamps: false,
});

module.exports = Camera;

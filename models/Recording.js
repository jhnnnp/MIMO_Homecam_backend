const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Recording = sequelize.define('Recording', {
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
    event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    index_num: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    filename: {
        type: DataTypes.STRING(255),
    },
    started_at: {
        type: DataTypes.DATE,
    },
    ended_at: {
        type: DataTypes.DATE,
    },
    duration: {
        type: DataTypes.INTEGER,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'Recording',
    timestamps: false,
});

module.exports = Recording;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserCustomSettings = sequelize.define('UserCustomSettings', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    setting_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    setting_value: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    data_type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string',
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
    tableName: 'UserCustomSettings',
    timestamps: false,
});

module.exports = UserCustomSettings;

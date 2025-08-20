const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    token: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        },
        field: 'userId',  // ✅ camelCase로 매핑
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expiresAt',  // ✅ camelCase로 매핑
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',  // ✅ camelCase로 매핑
    },
}, {
    tableName: 'RefreshToken',
    timestamps: false,
});

module.exports = RefreshToken; 
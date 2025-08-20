const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EmailVerification = sequelize.define('EmailVerification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    verification_code: {
        type: DataTypes.STRING(6),
        allowNull: false,
        comment: '6자리 인증 코드',
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '인증 코드 만료 시간',
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'EmailVerification',
    timestamps: false,
});

module.exports = EmailVerification; 
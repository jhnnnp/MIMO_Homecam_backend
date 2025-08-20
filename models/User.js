const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'passwordHash',  // ✅ 명시적 매핑
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    nickname: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '사용자 닉네임',
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '사용자 소개글',
    },
    birth: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '생년월일 (YYYY-MM-DD)',
    },
    picture: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '프로필 사진 URL',
    },
    emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '이메일 인증 여부',
        field: 'emailVerified',  // ✅ 명시적 매핑
    },
    googleId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Google 사용자 ID',
        field: 'googleId',  // ✅ 명시적 매핑
    },
    provider: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'local',
        comment: '로그인 제공자 (local, google)',
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',  // ✅ 명시적 매핑
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt',  // ✅ 명시적 매핑
    },

}, {
    tableName: 'User',
    timestamps: false,
    underscored: false,  // ✅ 명시적으로 false 설정
});

module.exports = User;

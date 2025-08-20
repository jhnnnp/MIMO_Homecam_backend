const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TermsAgreement = sequelize.define('TermsAgreement', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        },
        comment: '사용자 ID (User 테이블 참조)',
        field: 'userId',  // ✅ 명시적 매핑
    },
    termsOfService: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '이용약관 동의 여부',
        field: 'termsOfService',  // ✅ 명시적 매핑
    },
    privacyPolicy: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '개인정보 수집·이용 동의 여부',
        field: 'privacyPolicy',  // ✅ 명시적 매핑
    },
    microphonePermission: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '마이크 접근 권한 동의 여부',
        field: 'microphonePermission',  // ✅ 명시적 매핑
    },
    locationPermission: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '위치 접근 권한 동의 여부',
        field: 'locationPermission',  // ✅ 명시적 매핑
    },
    marketingConsent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '마케팅 정보 수신 동의 여부 (선택)',
        field: 'marketingConsent',  // ✅ 명시적 매핑
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',  // ✅ 명시적 매핑
    },
}, {
    tableName: 'TermsAgreement',
    timestamps: false,
    underscored: false,  // ✅ 명시적으로 false 설정
});

module.exports = TermsAgreement; 
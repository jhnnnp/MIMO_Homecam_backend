'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // TermsAgreement 테이블 생성
        await queryInterface.createTable('TermsAgreement', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'User',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: '사용자 ID (User 테이블 참조)',
            },
            termsOfService: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '이용약관 동의 여부',
            },
            privacyPolicy: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '개인정보 수집·이용 동의 여부',
            },
            microphonePermission: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '마이크 접근 권한 동의 여부',
            },
            locationPermission: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '위치 접근 권한 동의 여부',
            },
            marketingConsent: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '마케팅 정보 수신 동의 여부 (선택)',
            },
            agreedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                comment: '약관 동의 일시',
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
        });

        // TermsAgreement 테이블에 인덱스 추가
        await queryInterface.addIndex('TermsAgreement', ['userId']);
    },

    async down(queryInterface, Sequelize) {
        // TermsAgreement 테이블 삭제
        await queryInterface.dropTable('TermsAgreement');

        // User 테이블에서 추가된 컬럼들 제거
        await queryInterface.removeColumn('User', 'birth');
        await queryInterface.removeColumn('User', 'phoneVerified');
    }
}; 
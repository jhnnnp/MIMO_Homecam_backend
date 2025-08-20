'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('User', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            email: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
                comment: '사용자 이메일'
            },
            password_hash: {
                type: Sequelize.STRING(255),
                allowNull: true,
                comment: '비밀번호 해시'
            },
            name: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: '사용자 이름'
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: true,
                comment: '휴대폰 번호'
            },
            birth: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: '생년월일'
            },
            phoneVerified: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '휴대폰 인증 완료 여부'
            },
            emailVerified: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '이메일 인증 완료 여부'
            },
            provider: {
                type: Sequelize.ENUM('local', 'google', 'kakao'),
                allowNull: false,
                defaultValue: 'local',
                comment: '로그인 제공자'
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // 인덱스 추가
        await queryInterface.addIndex('User', ['email']);
        await queryInterface.addIndex('User', ['phone']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('User');
    }
}; 
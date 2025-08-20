'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // EmailVerification 테이블 생성
        await queryInterface.createTable('EmailVerification', {
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
                onDelete: 'CASCADE'
            },
            email: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            verificationCode: {
                type: Sequelize.STRING(6),
                allowNull: false,
            },
            isVerified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            verifiedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            }
        });

        // 인덱스 생성
        await queryInterface.addIndex('EmailVerification', ['userId']);
        await queryInterface.addIndex('EmailVerification', ['email']);
        await queryInterface.addIndex('EmailVerification', ['verificationCode']);
        await queryInterface.addIndex('EmailVerification', ['expiresAt']);

        // User 테이블에서 phone, phoneVerified 컬럼 제거
        await queryInterface.removeColumn('User', 'phone');
        await queryInterface.removeColumn('User', 'phoneVerified');

        // PhoneVerification 테이블 삭제 (존재하는 경우)
        try {
            await queryInterface.dropTable('PhoneVerification');
        } catch (error) {
            console.log('PhoneVerification 테이블이 존재하지 않습니다.');
        }
    },

    async down(queryInterface, Sequelize) {
        // EmailVerification 테이블 삭제
        await queryInterface.dropTable('EmailVerification');

        // User 테이블에 phone, phoneVerified 컬럼 다시 추가
        await queryInterface.addColumn('User', 'phone', {
            type: Sequelize.STRING(20),
            allowNull: true,
            unique: true,
        });

        await queryInterface.addColumn('User', 'phoneVerified', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        // PhoneVerification 테이블 다시 생성
        await queryInterface.createTable('PhoneVerification', {
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
                }
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },
            verificationCode: {
                type: Sequelize.STRING(6),
                allowNull: false,
            },
            isVerified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            verifiedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            }
        });
    }
}; 
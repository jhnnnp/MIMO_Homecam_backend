'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // googleId 컬럼 추가
        try {
            await queryInterface.addColumn('User', 'googleId', {
                type: Sequelize.STRING(100),
                allowNull: true,
                unique: true,
                comment: 'Google 사용자 ID'
            });
            console.log('✅ googleId 컬럼 추가 완료');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ googleId 컬럼이 이미 존재함');
            } else {
                throw error;
            }
        }

        // picture 컬럼 추가
        try {
            await queryInterface.addColumn('User', 'picture', {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: '프로필 사진 URL'
            });
            console.log('✅ picture 컬럼 추가 완료');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ picture 컬럼이 이미 존재함');
            } else {
                throw error;
            }
        }

        // provider 컬럼은 이미 User 테이블 생성 시 추가되었으므로 건너뜀
        console.log('ℹ️ provider 컬럼은 이미 존재함');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('User', 'googleId');
        await queryInterface.removeColumn('User', 'picture');
        await queryInterface.removeColumn('User', 'provider');
    }
}; 
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('User', 'nickname', {
            type: Sequelize.STRING(50),
            allowNull: true,
            comment: '사용자 닉네임',
        });

        await queryInterface.addColumn('User', 'bio', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: '사용자 소개글',
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('User', 'nickname');
        await queryInterface.removeColumn('User', 'bio');
    }
}; 
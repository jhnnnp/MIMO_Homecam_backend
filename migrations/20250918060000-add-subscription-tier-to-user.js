'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add subscription_tier column to User table
        await queryInterface.addColumn('User', 'subscription_tier', {
            type: Sequelize.ENUM('free', 'pro', 'premium'),
            allowNull: false,
            defaultValue: 'free',
            comment: '구독 등급 (free/pro/premium)'
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove subscription_tier column
        await queryInterface.removeColumn('User', 'subscription_tier');

        // Clean up enum type in PostgreSQL; in MySQL it is dropped with the column
        if (queryInterface.sequelize.getDialect() === 'postgres') {
            await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_User_subscription_tier";');
        }
    }
};












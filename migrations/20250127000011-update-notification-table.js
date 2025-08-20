'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // type 컬럼을 ENUM으로 변경
        await queryInterface.changeColumn('Notification', 'type', {
            type: Sequelize.ENUM('motion', 'sound', 'system', 'security', 'maintenance'),
            allowNull: false,
        });

        // sound_event_id 컬럼 추가
        await queryInterface.addColumn('Notification', 'sound_event_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'SoundEvent',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        // priority 컬럼 추가
        await queryInterface.addColumn('Notification', 'priority', {
            type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
            defaultValue: 'medium',
        });

        // 인덱스 추가
        await queryInterface.addIndex('Notification', ['sound_event_id']);
        await queryInterface.addIndex('Notification', ['priority']);
    },

    down: async (queryInterface, Sequelize) => {
        // 인덱스 제거
        await queryInterface.removeIndex('Notification', ['sound_event_id']);
        await queryInterface.removeIndex('Notification', ['priority']);

        // 컬럼 제거
        await queryInterface.removeColumn('Notification', 'priority');
        await queryInterface.removeColumn('Notification', 'sound_event_id');

        // type 컬럼을 원래대로 변경
        await queryInterface.changeColumn('Notification', 'type', {
            type: Sequelize.STRING(30),
        });
    }
}; 
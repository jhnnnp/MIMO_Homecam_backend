'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Notification 테이블에서 sound_event_id 컬럼 제거
        await queryInterface.removeColumn('Notification', 'sound_event_id');

        // Notification 테이블의 type ENUM에서 'sound' 제거
        await queryInterface.changeColumn('Notification', 'type', {
            type: Sequelize.ENUM('motion', 'system', 'security', 'maintenance'),
            allowNull: false,
        });
    },

    async down(queryInterface, Sequelize) {
        // 롤백: sound_event_id 컬럼 다시 추가
        await queryInterface.addColumn('Notification', 'sound_event_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'SoundEvent',
                key: 'id'
            }
        });

        // 롤백: type ENUM에 'sound' 다시 추가
        await queryInterface.changeColumn('Notification', 'type', {
            type: Sequelize.ENUM('motion', 'sound', 'system', 'security', 'maintenance'),
            allowNull: false,
        });
    }
}; 
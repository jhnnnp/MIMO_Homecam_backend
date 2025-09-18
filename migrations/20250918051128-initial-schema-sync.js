'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Event 테이블에 새로운 필드 추가
    try {
      await queryInterface.addColumn('Event', 'started_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      });
    } catch (error) {
      console.log('started_at 컬럼이 이미 존재합니다:', error.message);
    }

    try {
      await queryInterface.addColumn('Event', 'ended_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (error) {
      console.log('ended_at 컬럼이 이미 존재합니다:', error.message);
    }

    try {
      await queryInterface.addColumn('Event', 'metadata', {
        type: Sequelize.JSON,
        allowNull: true
      });
    } catch (error) {
      console.log('metadata 컬럼이 이미 존재합니다:', error.message);
    }

    // Recording 테이블에 새로운 필드 추가
    try {
      await queryInterface.addColumn('Recording', 'event_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Event',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {
      console.log('event_id 컬럼이 이미 존재합니다:', error.message);
    }

    try {
      await queryInterface.addColumn('Recording', 'index_num', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    } catch (error) {
      console.log('index_num 컬럼이 이미 존재합니다:', error.message);
    }

    // stream_url 컬럼 추가 (Camera 테이블)
    try {
      await queryInterface.addColumn('Camera', 'stream_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      });
    } catch (error) {
      console.log('stream_url 컬럼이 이미 존재합니다:', error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    // 추가된 컬럼들을 역순으로 제거
    await queryInterface.removeColumn('Camera', 'stream_url');
    await queryInterface.removeColumn('Recording', 'index_num');
    await queryInterface.removeColumn('Recording', 'event_id');
    await queryInterface.removeColumn('Event', 'metadata');
    await queryInterface.removeColumn('Event', 'ended_at');
    await queryInterface.removeColumn('Event', 'started_at');
  }
};

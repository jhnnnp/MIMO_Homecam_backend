'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Events 테이블: camera_id와 started_at에 대한 복합 인덱스
    await queryInterface.addIndex('Event', {
      fields: ['camera_id', 'started_at'],
      name: 'idx_event_camera_started_at'
    });

    // Events 테이블: timestamp 컬럼 인덱스 (자주 조회되는 필드)
    await queryInterface.addIndex('Event', {
      fields: ['timestamp'],
      name: 'idx_event_timestamp'
    });

    // Recordings 테이블: event_id와 index_num에 대한 복합 인덱스
    await queryInterface.addIndex('Recording', {
      fields: ['event_id', 'index_num'],
      name: 'idx_recording_event_index'
    });

    // Recordings 테이블: camera_id와 started_at에 대한 복합 인덱스
    await queryInterface.addIndex('Recording', {
      fields: ['camera_id', 'started_at'],
      name: 'idx_recording_camera_started_at'
    });

    // RefreshTokens 테이블: user_id 인덱스
    await queryInterface.addIndex('RefreshToken', {
      fields: ['user_id'],
      name: 'idx_refresh_token_user_id'
    });

    // Camera 테이블: device_id 인덱스 (이미 unique 제약이 있지만 명시적으로 추가)
    await queryInterface.addIndex('Camera', {
      fields: ['device_id'],
      name: 'idx_camera_device_id'
    });

    // Camera 테이블: status 인덱스 (필터링에 자주 사용)
    await queryInterface.addIndex('Camera', {
      fields: ['status'],
      name: 'idx_camera_status'
    });

    // Notification 테이블: user_id와 created_at 복합 인덱스
    await queryInterface.addIndex('Notification', {
      fields: ['user_id', 'created_at'],
      name: 'idx_notification_user_created'
    });

    // Events 테이블의 metadata JSON 필드에 대한 인덱스 (MySQL 8.0+ 기준)
    // objectType 필드를 추출하여 인덱스 생성
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_event_metadata_object_type 
        ON Event ((CAST(JSON_EXTRACT(metadata, '$.objectType') AS CHAR(30))))
      `);
    } catch (error) {
      console.log('JSON 인덱스 생성 실패 (MySQL 버전이 낮거나 지원하지 않음):', error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    // 생성한 인덱스들을 역순으로 제거
    try {
      await queryInterface.sequelize.query('DROP INDEX idx_event_metadata_object_type ON Event');
    } catch (error) {
      console.log('JSON 인덱스 제거 실패:', error.message);
    }

    await queryInterface.removeIndex('Notification', 'idx_notification_user_created');
    await queryInterface.removeIndex('Camera', 'idx_camera_status');
    await queryInterface.removeIndex('Camera', 'idx_camera_device_id');
    await queryInterface.removeIndex('RefreshToken', 'idx_refresh_token_user_id');
    await queryInterface.removeIndex('Recording', 'idx_recording_camera_started_at');
    await queryInterface.removeIndex('Recording', 'idx_recording_event_index');
    await queryInterface.removeIndex('Event', 'idx_event_timestamp');
    await queryInterface.removeIndex('Event', 'idx_event_camera_started_at');
  }
};

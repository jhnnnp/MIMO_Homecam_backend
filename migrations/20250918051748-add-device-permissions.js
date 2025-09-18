'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Camera 테이블의 user_id를 owner_id로 변경
    await queryInterface.renameColumn('Camera', 'user_id', 'owner_id');

    // 2. DevicePermissions 테이블 생성
    await queryInterface.createTable('DevicePermissions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      camera_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Camera',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      permission_level: {
        type: Sequelize.ENUM('viewer', 'controller', 'admin'),
        allowNull: false,
        defaultValue: 'viewer',
        comment: 'viewer: 조회만, controller: 조회+제어, admin: 모든 권한'
      },
      granted_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '권한을 부여한 사용자 ID (일반적으로 카메라 소유자)'
      },
      granted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '권한 만료 일시 (NULL이면 영구)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '권한 부여에 대한 메모'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. 복합 유니크 제약 조건 추가 (camera_id + user_id)
    await queryInterface.addIndex('DevicePermissions', {
      fields: ['camera_id', 'user_id'],
      unique: true,
      name: 'unique_camera_user_permission'
    });

    // 4. 성능 최적화를 위한 인덱스 추가
    await queryInterface.addIndex('DevicePermissions', {
      fields: ['user_id'],
      name: 'idx_device_permissions_user_id'
    });

    await queryInterface.addIndex('DevicePermissions', {
      fields: ['camera_id', 'is_active'],
      name: 'idx_device_permissions_camera_active'
    });

    await queryInterface.addIndex('DevicePermissions', {
      fields: ['permission_level'],
      name: 'idx_device_permissions_level'
    });

    // 5. 만료 시간 기반 인덱스
    await queryInterface.addIndex('DevicePermissions', {
      fields: ['expires_at', 'is_active'],
      name: 'idx_device_permissions_expiry'
    });
  },

  async down (queryInterface, Sequelize) {
    // DevicePermissions 테이블 제거
    await queryInterface.dropTable('DevicePermissions');
    
    // Camera 테이블의 owner_id를 다시 user_id로 변경
    await queryInterface.renameColumn('Camera', 'owner_id', 'user_id');
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. UserSettings 테이블 생성 (고정 스키마)
    await queryInterface.createTable('UserSettings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      notification_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      motion_sensitivity: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
        allowNull: false
      },
      auto_recording: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      recording_quality: {
        type: Sequelize.ENUM('720p', '1080p', '4K'),
        defaultValue: '1080p',
        allowNull: false
      },
      storage_days: {
        type: Sequelize.INTEGER,
        defaultValue: 30,
        allowNull: false
      },
      dark_mode: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'ko',
        allowNull: false
      },
      timezone: {
        type: Sequelize.STRING(50),
        defaultValue: 'Asia/Seoul',
        allowNull: false
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

    // 2. UserCustomSettings 테이블 생성 (Key-Value 스키마)
    await queryInterface.createTable('UserCustomSettings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      setting_key: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      setting_value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      data_type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string',
        allowNull: false
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

    // 3. 복합 유니크 제약 조건 추가 (user_id + setting_key)
    await queryInterface.addIndex('UserCustomSettings', {
      fields: ['user_id', 'setting_key'],
      unique: true,
      name: 'unique_user_custom_setting'
    });

    // 4. 기존 Settings 테이블의 데이터를 새 테이블로 이전
    const existingSettings = await queryInterface.sequelize.query(
      'SELECT * FROM Settings',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 고정 설정 필드들
    const fixedSettings = ['notification_enabled', 'motion_sensitivity', 'auto_recording',
      'recording_quality', 'storage_days', 'dark_mode', 'language', 'timezone'];

    // 사용자별로 그룹화
    const userSettings = {};
    for (const setting of existingSettings) {
      if (!userSettings[setting.user_id]) {
        userSettings[setting.user_id] = { fixed: {}, custom: [] };
      }

      if (fixedSettings.includes(setting.key)) {
        userSettings[setting.user_id].fixed[setting.key] = setting.value;
      } else {
        userSettings[setting.user_id].custom.push({
          setting_key: setting.key,
          setting_value: setting.value
        });
      }
    }

    // 새 테이블에 데이터 삽입
    for (const [userId, settings] of Object.entries(userSettings)) {
      // UserSettings에 고정 설정 삽입
      await queryInterface.bulkInsert('UserSettings', [{
        user_id: parseInt(userId),
        notification_enabled: settings.fixed.notification_enabled || true,
        motion_sensitivity: settings.fixed.motion_sensitivity || 'medium',
        auto_recording: settings.fixed.auto_recording || true,
        recording_quality: settings.fixed.recording_quality || '1080p',
        storage_days: parseInt(settings.fixed.storage_days) || 30,
        dark_mode: settings.fixed.dark_mode || false,
        language: settings.fixed.language || 'ko',
        timezone: settings.fixed.timezone || 'Asia/Seoul',
        created_at: new Date(),
        updated_at: new Date()
      }]);

      // UserCustomSettings에 커스텀 설정 삽입
      if (settings.custom.length > 0) {
        const customSettings = settings.custom.map(custom => ({
          user_id: parseInt(userId),
          setting_key: custom.setting_key,
          setting_value: custom.setting_value,
          data_type: 'string',
          created_at: new Date(),
          updated_at: new Date()
        }));
        await queryInterface.bulkInsert('UserCustomSettings', customSettings);
      }
    }

    // 5. 기존 Settings 테이블을 백업으로 이름 변경
    await queryInterface.renameTable('Settings', 'Settings_backup');
  },

  async down(queryInterface, Sequelize) {
    // 백업에서 원본 Settings 테이블 복원
    await queryInterface.renameTable('Settings_backup', 'Settings');

    // 새로 생성한 테이블들 제거
    await queryInterface.dropTable('UserCustomSettings');
    await queryInterface.dropTable('UserSettings');
  }
};

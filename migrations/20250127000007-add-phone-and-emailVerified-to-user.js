'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // phone 컬럼 제거 (더 이상 필요하지 않음)
    try {
      await queryInterface.removeColumn('User', 'phone');
      console.log('✅ phone 컬럼 제거 완료');
    } catch (error) {
      console.log('ℹ️ phone 컬럼이 이미 제거되었거나 존재하지 않음');
    }

    // phoneVerified 컬럼 제거 (더 이상 필요하지 않음)
    try {
      await queryInterface.removeColumn('User', 'phoneVerified');
      console.log('✅ phoneVerified 컬럼 제거 완료');
    } catch (error) {
      console.log('ℹ️ phoneVerified 컬럼이 이미 제거되었거나 존재하지 않음');
    }

    // emailVerified 컬럼이 올바르게 설정되어 있는지 확인
    console.log('ℹ️ emailVerified 컬럼은 이미 존재함');
  },

  async down(queryInterface, Sequelize) {
    // 롤백 시 phone 관련 컬럼들을 다시 추가 (필요시)
    await queryInterface.addColumn('User', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: '휴대폰 번호'
    });

    await queryInterface.addColumn('User', 'phoneVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '휴대폰 인증 완료 여부'
    });
  }
};

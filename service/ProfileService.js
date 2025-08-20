// service/ProfileService.js
'use strict';

const { User } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  /**
   * 사용자 기본 프로필 조회
   * @param {number} userId - 사용자 ID
   * @returns {Promise<Object>} 사용자 정보
   */
  async getProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'name', 'nickname', 'bio', 'birth', 'emailVerified', 'provider', 'picture', 'createdAt']
      });
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      return user;
    } catch (error) {
      console.error('🚨 프로필 조회 에러:', error.message);
      throw new Error(error.message);
    }
  },

  /**
   * 사용자 기본 프로필 수정
   * @param {number} userId - 사용자 ID
   * @param {Object} data - 수정할 프로필 데이터
   * @returns {Promise<Object>} 수정된 사용자 정보
   */
  async updateProfile(userId, data) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('수정할 사용자를 찾을 수 없습니다.');
      }

      const fieldsToUpdate = {};
      if (data.username) {
        fieldsToUpdate.name = data.username;
        fieldsToUpdate.nickname = data.username; // username을 nickname으로도 업데이트
      }
      if (data.bio) fieldsToUpdate.bio = data.bio;
      if (data.birth) fieldsToUpdate.birth = data.birth;
      if (data.nickname) fieldsToUpdate.nickname = data.nickname;

      await user.update(fieldsToUpdate);
      return { message: '프로필이 수정되었습니다.', user };
    } catch (error) {
      console.error('🚨 프로필 수정 에러:', error.message);
      throw new Error(error.message);
    }
  },


};

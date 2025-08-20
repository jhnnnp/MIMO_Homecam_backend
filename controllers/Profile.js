// controllers/Profile.js
'use strict';

const express = require('express');
const router = express.Router();
const profileService = require('../service/ProfileService');
const emailVerificationService = require('../service/emailVerificationService');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * ✅ [GET] /profile
 * 내 프로필 기본 정보 조회
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const profile = await profileService.getProfile(req.user.userId);

    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: { code: 'E_NOT_FOUND', message: '사용자 정보를 찾을 수 없습니다.' }
      });
    }

    res.status(200).json({ ok: true, data: profile });
  } catch (error) {
    console.error('🚨 [GET /profile] 프로필 조회 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '서버 오류로 프로필을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * ✅ [PUT] /profile
 * 내 프로필 수정 (부분 수정 가능)
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { username, nickname, bio, birth } = req.body;

    // 수정할 필드 하나라도 없으면 에러
    if (!username && !nickname && !bio && !birth) {
      return res.status(400).json({
        success: false,
        message: '수정할 항목(username, nickname, bio, birth) 중 하나 이상이 필요합니다.',
        data: null
      });
    }

    const updatedResult = await profileService.updateProfile(req.user.userId, { username, nickname, bio, birth });

    res.status(200).json({ ok: true, data: updatedResult.user });
  } catch (error) {
    console.error('🚨 [PUT /profile] 프로필 수정 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '서버 오류로 프로필을 수정할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * ✅ [POST] /profile/email-verification
 * 이메일 인증 코드 발송
 */
router.post('/email-verification', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일 주소가 필요합니다.',
        data: null
      });
    }

    const result = await emailVerificationService.sendVerificationEmail(req.user.userId, email);

    res.status(200).json({ ok: true, data: { message: result.message } });
  } catch (error) {
    console.error('🚨 [POST /profile/email-verification] 이메일 인증 코드 발송 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '이메일 인증 코드 발송에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * ✅ [POST] /profile/verify-email
 * 이메일 인증 코드 확인
 */
router.post('/verify-email', authMiddleware, async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: '이메일과 인증 코드가 필요합니다.',
        data: null
      });
    }

    const result = await emailVerificationService.verifyEmailCode(req.user.userId, email, verificationCode);

    res.status(200).json({ ok: true, data: { message: result.message } });
  } catch (error) {
    console.error('🚨 [POST /profile/verify-email] 이메일 인증 코드 확인 에러:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

/**
 * ✅ [GET] /profile/email-verification-status
 * 이메일 인증 상태 확인
 */
router.get('/email-verification-status', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일 주소가 필요합니다.',
        data: null
      });
    }

    const result = await emailVerificationService.checkEmailVerificationStatus(req.user.userId, email);

    res.status(200).json({
      success: true,
      message: '이메일 인증 상태 조회 성공',
      data: result
    });
  } catch (error) {
    console.error('🚨 [GET /profile/email-verification-status] 이메일 인증 상태 확인 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '이메일 인증 상태 확인에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;

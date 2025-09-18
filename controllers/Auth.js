// controllers/Auth.js
const express = require('express');
const router = express.Router();
const authService = require('../service/authService');
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');
const validateSignup = require('../middlewares/validateSignup');
const User = require('../models/User');
const TermsAgreement = require('../models/TermsAgreement');

// 유틸리티 import
const { ok, err, errors } = require('../utils/responseHelpers');
const { isValidEmail, validatePassword } = require('../utils/validationHelpers');
const asyncHandler = require('../utils/asyncHandler');
const { createRequestLog, createResponseLog, createErrorLog, log, maskEmail } = require('../utils/logger');

/**
 * [POST] /auth/signup
 * 일반 회원가입
 */
router.post('/signup', validateSignup, asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'SIGNUP');
  log('info', requestLog);

  const {
    email,
    password,
    name,
    nickname,
    birth,
    agreeTerms,
    agreePrivacy,
    agreeMicrophone,
    agreeLocation,
    agreeMarketing
  } = req.body;

  // 필수 필드 검증
  if (!email || !password || !name || !nickname) {
    const responseLog = createResponseLog(res, 400, '필수 정보가 누락되었습니다.');
    log('warn', responseLog);
    return errors.validation(res, '필수 정보가 누락되었습니다.');
  }

  // 필수 약관 동의 검증
  if (!agreeTerms || !agreePrivacy || !agreeMicrophone || !agreeLocation) {
    const responseLog = createResponseLog(res, 400, '필수 약관에 동의해주세요.');
    log('warn', responseLog);
    return errors.validation(res, '필수 약관에 동의해주세요.');
  }

  const signupData = {
    email,
    password,
    name,
    nickname,
    birth,
    agreeTerms,
    agreePrivacy,
    agreeMicrophone,
    agreeLocation,
    agreeMarketing: agreeMarketing || false
  };

  const user = await authService.signup(signupData);

  const responseLog = createResponseLog(res, 201, '회원가입이 완료되었습니다.');
  log('info', responseLog);

  res.status(201).json({
    ok: true,
    data: {
      message: '회원가입이 완료되었습니다.',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      },
      tokens: user.tokens
    }
  });
}));

/**
 * [POST] /auth/register
 * 간단한 회원가입
 */
router.post('/register', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'REGISTER');
  log('info', requestLog);

  const { email, password, displayName, accepts } = req.body;

  // 필수 필드 검증
  if (!email || !password || !displayName) {
    const responseLog = createResponseLog(res, 400, '이메일, 비밀번호, 이름을 모두 입력해주세요.');
    log('warn', responseLog);
    return errors.validation(res, '이메일, 비밀번호, 이름을 모두 입력해주세요.');
  }

  // 약관 동의 검증
  if (!accepts?.tosVersion || !accepts?.privacyVersion) {
    const responseLog = createResponseLog(res, 400, '필수 약관에 동의해주세요.');
    log('warn', responseLog);
    return errors.validation(res, '필수 약관에 동의해주세요.');
  }

  // 이메일 중복 체크
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    const responseLog = createResponseLog(res, 409, '이미 가입된 이메일입니다.');
    log('warn', responseLog);
    return errors.conflict(res, '이미 가입된 이메일입니다.');
  }

  // 비밀번호 해시화
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);

  // 사용자 생성
  const user = await User.create({
    email,
    passwordHash: hashedPassword,
    name: displayName,
    nickname: displayName,
    emailVerified: false,
    provider: 'local'
  });

  // 약관 동의 저장
  await TermsAgreement.create({
    userId: user.id,
    termsOfService: true,
    privacyPolicy: true,
    microphonePermission: true,
    locationPermission: true,
    marketingConsent: accepts?.marketing || false
  });

  const responseLog = createResponseLog(res, 201, '회원가입이 완료되었습니다.');
  log('info', responseLog);

  ok(res, {
    message: '회원가입이 완료되었습니다.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified
    }
  }, null, 201);
}));

/**
 * [POST] /auth/login
 * 이메일/비밀번호 로그인
 */
router.post('/login', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'LOGIN');
  log('info', requestLog);

  const { email, password } = req.body;

  if (!email || !password) {
    const responseLog = createResponseLog(res, 400, '이메일과 비밀번호가 필요합니다.');
    log('warn', responseLog);
    return errors.validation(res, '이메일과 비밀번호가 필요합니다.');
  }

  const tokens = await authService.login(email, password);

  const responseLog = createResponseLog(res, 200, '로그인 성공');
  log('info', responseLog);

  ok(res, tokens);
}));

/**
 * [POST] /auth/refresh
 * 토큰 갱신 (쿠키 기반)
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'REFRESH');
  log('info', requestLog);

  // 쿠키에서 리프레시 토큰 가져오기
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    const responseLog = createResponseLog(res, 401, '리프레시 토큰이 없습니다.');
    log('warn', responseLog);
    return errors.unauthorized(res, '리프레시 토큰이 없습니다.');
  }

  const tokens = await authService.refreshToken(refreshToken);

  // 새로운 토큰을 HttpOnly 쿠키로 설정
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
  });

  const responseLog = createResponseLog(res, 200, '토큰 갱신 성공');
  log('info', responseLog);

  ok(res, { accessToken: tokens.accessToken });
}));

/**
 * [POST] /auth/google-login
 * 구글 로그인 - 백엔드에서 Google OAuth 직접 처리
 */
router.post('/google-login', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'GOOGLE_LOGIN');
  log('info', requestLog);

  const { clientId, platform } = req.body;

  if (!clientId || !platform) {
    const responseLog = createResponseLog(res, 400, '클라이언트 ID와 플랫폼 정보가 필요합니다.');
    log('warn', responseLog);
    return errors.validation(res, '클라이언트 ID와 플랫폼 정보가 필요합니다.');
  }

  const result = await authService.handleGoogleOAuth(clientId, platform);

  if (result.success) {
    const responseLog = createResponseLog(res, 200, 'Google OAuth URL 생성 성공');
    log('info', responseLog);

    ok(res, {
      message: 'Google OAuth URL이 생성되었습니다.',
      authUrl: result.authUrl
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error || '구글 로그인에 실패했습니다.');
    log('error', responseLog);
    return err(res, 'E_GOOGLE_OAUTH_FAILED', result.error || '구글 로그인에 실패했습니다.', 400);
  }
}));

/**
 * [GET] /auth/google/callback
 * Google OAuth callback 처리
 */
router.get('/google/callback', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'GOOGLE_CALLBACK');
  log('info', requestLog);

  const { code, error } = req.query;

  if (error) {
    const responseLog = createResponseLog(res, 400, 'Google OAuth 오류가 발생했습니다.');
    log('error', responseLog);
    return res.redirect(`${process.env.APP_DEEP_LINK_BASE || 'exp://localhost:19000'}?error=${encodeURIComponent('Google OAuth 오류가 발생했습니다.')}`);
  }

  if (!code) {
    const responseLog = createResponseLog(res, 400, '인증 코드가 필요합니다.');
    log('warn', responseLog);
    return res.redirect(`${process.env.APP_DEEP_LINK_BASE || 'exp://localhost:19000'}?error=${encodeURIComponent('인증 코드가 필요합니다.')}`);
  }

  const tokenResult = await authService.exchangeGoogleCode(code);

  if (tokenResult.success) {
    const isLinkMode = req.query.mode === 'link';
    const baseUrl = process.env.APP_DEEP_LINK_BASE || 'exp://localhost:19000';

    if (isLinkMode) {
      const redirectUrl = `${baseUrl}?success=true&mode=link&googleId=${tokenResult.user?.googleId}&googleEmail=${encodeURIComponent(tokenResult.user?.email)}&googleName=${encodeURIComponent(tokenResult.user?.name)}`;
      res.redirect(redirectUrl);
    } else {
      const redirectUrl = `${baseUrl}?success=true&userId=${tokenResult.user?.userId}&accessToken=${encodeURIComponent(tokenResult.tokens?.accessToken)}&refreshToken=${encodeURIComponent(tokenResult.tokens?.refreshToken)}`;
      res.redirect(redirectUrl);
    }
  } else if (tokenResult.needsSignup) {
    const baseUrl = process.env.APP_DEEP_LINK_BASE || 'exp://localhost:19000';
    const redirectUrl = `${baseUrl}?needsSignup=true&googleEmail=${encodeURIComponent(tokenResult.googleUserInfo?.email)}&googleName=${encodeURIComponent(tokenResult.googleUserInfo?.name)}&googleId=${tokenResult.googleUserInfo?.googleId}`;
    res.redirect(redirectUrl);
  } else {
    const baseUrl = process.env.APP_DEEP_LINK_BASE || 'exp://localhost:19000';
    res.redirect(`${baseUrl}?error=${encodeURIComponent(tokenResult.error)}`);
  }
}));

/**
 * [GET] /auth/account
 * 계정 정보 조회
 */
router.get('/account', authMiddleware, asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'ACCOUNT');
  log('info', requestLog);

  const userInfo = await authService.getAccount(req.user.userId);

  const responseLog = createResponseLog(res, 200, '계정 정보 조회 성공');
  log('info', responseLog);

  ok(res, userInfo);
}));

/**
 * [POST] /auth/find-id
 * 아이디 찾기
 */
router.post('/find-id', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'FIND_ID');
  log('info', requestLog);

  const { email } = req.body;

  if (!email) {
    const responseLog = createResponseLog(res, 400, '이메일을 입력해주세요.');
    log('warn', responseLog);
    return errors.validation(res, '이메일을 입력해주세요.');
  }

  const result = await authService.findId(email);

  if (result.success) {
    const responseLog = createResponseLog(res, 200, '아이디 찾기 성공');
    log('info', responseLog);

    ok(res, {
      message: '아이디 정보가 이메일로 발송되었습니다.'
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error);
    log('warn', responseLog);
    return err(res, 'E_FIND_ID_FAILED', result.error, 400);
  }
}));

/**
 * [POST] /auth/find-password/send-code
 * 비밀번호 찾기 - 인증번호 발송
 */
router.post('/find-password/send-code', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'FIND_PASSWORD_SEND');
  log('info', requestLog);

  const { email } = req.body;

  if (!email) {
    const responseLog = createResponseLog(res, 400, '이메일이 필요합니다.');
    log('warn', responseLog);
    return errors.validation(res, '이메일이 필요합니다.');
  }

  const user = await authService.findUserByEmail(email);

  if (!user) {
    const responseLog = createResponseLog(res, 400, '해당 이메일로 가입된 사용자가 없습니다.');
    log('warn', responseLog);
    return errors.notFound(res, '해당 이메일로 가입된 사용자가 없습니다.');
  }

  const result = await authService.sendPasswordResetCode(email);

  if (result.success) {
    const responseLog = createResponseLog(res, 200, '인증번호 발송 성공');
    log('info', responseLog);

    ok(res, {
      message: '인증번호가 이메일로 발송되었습니다.',
      expiresAt: result.expiresAt
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error);
    log('error', responseLog);
    return err(res, 'E_SEND_CODE_FAILED', result.error, 400);
  }
}));

/**
 * [POST] /auth/find-password/reset
 * 비밀번호 찾기 - 인증번호 확인 및 새 비밀번호 설정
 */
router.post('/find-password/reset', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'FIND_PASSWORD_RESET');
  log('info', requestLog);

  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    const responseLog = createResponseLog(res, 400, '이메일, 인증번호, 새 비밀번호가 필요합니다.');
    log('warn', responseLog);
    return errors.validation(res, '이메일, 인증번호, 새 비밀번호가 필요합니다.');
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    const responseLog = createResponseLog(res, 400, passwordValidation.errors.join(', '));
    log('warn', responseLog);
    return errors.validation(res, passwordValidation.errors.join(', '));
  }

  const result = await authService.resetPasswordWithCode(email, code, newPassword);

  if (result.success) {
    const responseLog = createResponseLog(res, 200, '비밀번호 재설정 성공');
    log('info', responseLog);

    ok(res, {
      message: '비밀번호가 성공적으로 재설정되었습니다.'
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error);
    log('warn', responseLog);
    return err(res, 'E_PASSWORD_RESET_FAILED', result.error, 400);
  }
}));

/**
 * [POST] /auth/link-google
 * 기존 계정과 구글 계정 연결
 */
router.post('/link-google', authMiddleware, asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'LINK_GOOGLE');
  log('info', requestLog);

  const { googleId, googleEmail, googleName } = req.body;
  const userId = req.user.userId;

  if (!googleId || !googleEmail || !googleName) {
    const responseLog = createResponseLog(res, 400, '구글 계정 정보가 누락되었습니다.');
    log('warn', responseLog);
    return errors.validation(res, '구글 계정 정보가 누락되었습니다.');
  }

  const result = await authService.linkGoogleAccount(userId, { googleId, googleEmail, googleName });

  if (result.success) {
    const responseLog = createResponseLog(res, 200, '구글 계정 연결 성공');
    log('info', responseLog);

    ok(res, {
      message: 'Google 계정이 성공적으로 연결되었습니다.',
      user: result.user
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error);
    log('warn', responseLog);
    return err(res, 'E_GOOGLE_LINK_FAILED', result.error, 400);
  }
}));

/**
 * [POST] /auth/logout
 * 로그아웃
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'LOGOUT');
  log('info', requestLog);

  // 쿠키 삭제
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  const responseLog = createResponseLog(res, 200, '로그아웃 성공');
  log('info', responseLog);

  ok(res, {
    message: '로그아웃이 완료되었습니다.'
  });
}));

/**
 * [PUT] /auth/change-password
 * 비밀번호 변경
 */
router.put('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'CHANGE_PASSWORD');
  log('info', requestLog);

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    const responseLog = createResponseLog(res, 400, '현재 비밀번호와 새 비밀번호가 필요합니다.');
    log('warn', responseLog);
    return errors.validation(res, '현재 비밀번호와 새 비밀번호가 필요합니다.');
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    const responseLog = createResponseLog(res, 400, passwordValidation.errors.join(', '));
    log('warn', responseLog);
    return errors.validation(res, passwordValidation.errors.join(', '));
  }

  const result = await authService.changePassword(userId, currentPassword, newPassword);

  if (result.success) {
    const responseLog = createResponseLog(res, 200, '비밀번호 변경 성공');
    log('info', responseLog);

    ok(res, {
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error);
    log('warn', responseLog);
    return err(res, 'E_PASSWORD_CHANGE_FAILED', result.error, 400);
  }
}));

/**
 * [PUT] /auth/update-profile
 * 프로필 정보 수정
 */
router.put('/update-profile', authMiddleware, asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'UPDATE_PROFILE');
  log('info', requestLog);

  const { nickname, name, bio } = req.body;
  const userId = req.user.userId;

  if (!nickname && !name && !bio) {
    const responseLog = createResponseLog(res, 400, '수정할 항목이 필요합니다.');
    log('warn', responseLog);
    return errors.validation(res, '수정할 항목이 필요합니다.');
  }

  const result = await authService.updateProfile(userId, { nickname, name, bio });

  if (result.success) {
    const responseLog = createResponseLog(res, 200, '프로필 수정 성공');
    log('info', responseLog);

    ok(res, {
      message: '프로필이 성공적으로 수정되었습니다.',
      user: result.user
    });
  } else {
    const responseLog = createResponseLog(res, 400, result.error);
    log('warn', responseLog);
    return err(res, 'E_PROFILE_UPDATE_FAILED', result.error, 400);
  }
}));

/**
 * [POST] /auth/validate-password
 * 현재 비밀번호 검증
 */
router.post('/validate-password', authMiddleware, asyncHandler(async (req, res) => {
  const requestLog = createRequestLog(req, 'VALIDATE_PASSWORD');
  log('info', requestLog);

  const { password } = req.body;
  const userId = req.user.userId;

  if (!password) {
    const responseLog = createResponseLog(res, 400, '비밀번호를 입력해주세요.');
    log('warn', responseLog);
    return errors.validation(res, '비밀번호를 입력해주세요.');
  }

  const isValid = await authService.validatePassword(userId, password);

  if (isValid) {
    const responseLog = createResponseLog(res, 200, '비밀번호 검증 성공');
    log('info', responseLog);

    ok(res, {
      message: '비밀번호가 올바릅니다.'
    });
  } else {
    const responseLog = createResponseLog(res, 400, '비밀번호가 올바르지 않습니다.');
    log('warn', responseLog);
    return errors.validation(res, '비밀번호가 올바르지 않습니다.');
  }
}));

// Passport 기반 구글 로그인 (레거시 지원)
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent'
}));

module.exports = router;
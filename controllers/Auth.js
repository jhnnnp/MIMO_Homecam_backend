// controllers/Auth.js
const express = require('express');
const router = express.Router();
const authService = require('../service/authService');
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');
const validateSignup = require('../middlewares/validateSignup');
const User = require('../models/User'); // Added missing import
const TermsAgreement = require('../models/TermsAgreement'); // Added missing import

/**
 * [POST] /auth/signup
 * 일반 회원가입 - 새로운 구조
 */
router.post('/signup', validateSignup, async (req, res) => {
  console.log('==============================');
  console.log('[SIGNUP] 회원가입 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const {
      email,
      password,
      name,
      nickname,
      birth,
      // 약관 동의 정보
      agreeTerms,
      agreePrivacy,
      agreeMicrophone,
      agreeLocation,
      agreeMarketing
    } = req.body;

    console.log('🔍 [SIGNUP] 필수 필드 검증 시작');
    console.log(`  📧 이메일: ${email} (${email ? '✅' : '❌'})`);
    console.log(`  🔐 비밀번호: ${password ? '✅' : '❌'}`);
    console.log(`  👤 이름: ${name} (${name ? '✅' : '❌'})`);
    console.log(`  🏷️ 닉네임: ${nickname} (${nickname ? '✅' : '❌'})`);
    console.log(`  📅 생년월일: ${birth} (${birth ? '✅' : '❌'})`);

    // 필수 필드 검증
    if (!email || !password || !name || !nickname) {
      console.log('❌ [SIGNUP] 필수 필드 누락');
      console.log(`  📧 이메일: ${!email ? '누락' : '있음'}`);
      console.log(`  🔐 비밀번호: ${!password ? '누락' : '있음'}`);
      console.log(`  👤 이름: ${!name ? '누락' : '있음'}`);
      console.log(`  🏷️ 닉네임: ${!nickname ? '누락' : '있음'}`);
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    console.log('✅ [SIGNUP] 필수 필드 검증 통과');

    console.log('🔍 [SIGNUP] 약관 동의 검증 시작');
    console.log(`  📋 이용약관: ${agreeTerms ? '✅' : '❌'}`);
    console.log(`  🔒 개인정보: ${agreePrivacy ? '✅' : '❌'}`);
    console.log(`  🎤 마이크: ${agreeMicrophone ? '✅' : '❌'}`);
    console.log(`  📍 위치: ${agreeLocation ? '✅' : '❌'}`);
    console.log(`  📢 마케팅: ${agreeMarketing ? '✅' : '❌'}`);

    // 필수 약관 동의 검증
    if (!agreeTerms || !agreePrivacy || !agreeMicrophone || !agreeLocation) {
      console.log('❌ [SIGNUP] 필수 약관 미동의');
      console.log(`  📋 이용약관: ${!agreeTerms ? '미동의' : '동의'}`);
      console.log(`  🔒 개인정보: ${!agreePrivacy ? '미동의' : '동의'}`);
      console.log(`  🎤 마이크: ${!agreeMicrophone ? '미동의' : '동의'}`);
      console.log(`  📍 위치: ${!agreeLocation ? '미동의' : '동의'}`);
      return res.status(400).json({ error: '필수 약관에 동의해주세요.' });
    }

    console.log('✅ [SIGNUP] 약관 동의 검증 통과');

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

    console.log('🚀 [SIGNUP] authService.signup 호출 시작');
    console.log('📦 전달할 데이터:', JSON.stringify(signupData, null, 2));

    const user = await authService.signup(signupData);

    console.log('✅ [SIGNUP] 회원가입 성공');
    console.log(`  👤 사용자 ID: ${user.userId}`);
    console.log(`  📧 이메일: ${user.email}`);

    console.log(`  📧 이메일 인증: ${user.emailVerified ? '완료' : '미완료'}`);

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      },
      tokens: user.tokens
    });
  } catch (error) {
    console.log('❌ [SIGNUP] 회원가입 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log(`  📝 스택 트레이스: ${error.stack}`);
    console.log('📦 요청 데이터 재확인:');
    console.log(`  📧 이메일: ${req.body.email || '없음'}`);
    console.log(`  👤 이름: ${req.body.name || '없음'}`);
    console.log(`  🏷️ 닉네임: ${req.body.nickname || '없음'}`);
    console.log(`  📅 생년월일: ${req.body.birth || '없음'}`);
    console.log(`  🔢 인증번호: ${req.body.code || '없음'}`);
    console.log(`  📋 약관 동의: ${req.body.agreeTerms ? '이용약관✅' : '이용약관❌'} ${req.body.agreePrivacy ? '개인정보✅' : '개인정보❌'} ${req.body.agreeMicrophone ? '마이크✅' : '마이크❌'} ${req.body.agreeLocation ? '위치✅' : '위치❌'} ${req.body.agreeMarketing ? '마케팅✅' : '마케팅❌'}`);
    console.log('==============================');
    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/signup/kakao
 */
router.post('/signup/kakao', async (req, res) => {
  try {
    const { token, email, username } = req.body;
    if (!token) return res.status(400).json({ error: '카카오 액세스 토큰이 필요합니다.' });
    const user = await authService.signupKakao(token, email, username);
    res.status(201).json({ message: '카카오 회원가입 완료', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// controllers/Auth.js
// 구글 로그인
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent'
}));

// 기존 passport 기반 구글 콜백 라우트 (사용하지 않음)
// router.get('/google/callback',
//   passport.authenticate('google', { failureRedirect: '/' }),
//   (req, res) => {
//     res.status(200).json({
//       success: true,
//       message: 'Google 로그인 성공',
//       user: req.user
//     });
//   }
// );



/**
 * [POST] /auth/login
 * 이메일/비밀번호 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tokens = await authService.login(email, password);
    res.status(200).json({ ok: true, data: tokens });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * [POST] /api/auth/register
 * 회원가입 - 새로운 간단한 구현
 */
router.post('/register', async (req, res) => {
  console.log('==============================');
  console.log('[REGISTER] 회원가입 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { email, password, displayName, accepts } = req.body;

    // 1. 필수 필드 검증
    if (!email || !password || !displayName) {
      console.log('❌ [REGISTER] 필수 필드 누락');
      return res.status(400).json({
        ok: false,
        error: '이메일, 비밀번호, 이름을 모두 입력해주세요.'
      });
    }

    // 2. 약관 동의 검증
    if (!accepts?.tosVersion || !accepts?.privacyVersion) {
      console.log('❌ [REGISTER] 필수 약관 미동의');
      return res.status(400).json({
        ok: false,
        error: '필수 약관에 동의해주세요.'
      });
    }

    console.log('✅ [REGISTER] 입력 검증 통과');

    // 3. 이메일 중복 체크
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('❌ [REGISTER] 이메일 중복');
      return res.status(409).json({
        ok: false,
        error: '이미 가입된 이메일입니다.'
      });
    }

    console.log('✅ [REGISTER] 이메일 중복 체크 통과');

    // 4. 비밀번호 해시화
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. 사용자 생성
    const user = await User.create({
      email,
      passwordHash: hashedPassword,
      name: displayName,
      nickname: displayName,
      emailVerified: false,
      provider: 'local'
    });

    console.log('✅ [REGISTER] 사용자 생성 완료');
    console.log(`  👤 사용자 ID: ${user.id}`);
    console.log(`  📧 이메일: ${user.email}`);

    // 6. 약관 동의 저장
    await TermsAgreement.create({
      userId: user.id,
      termsOfService: true,
      privacyPolicy: true,
      microphonePermission: true,
      locationPermission: true,
      marketingConsent: accepts?.marketing || false
    });

    console.log('✅ [REGISTER] 약관 동의 저장 완료');

    // 7. 성공 응답
    res.status(201).json({
      ok: true,
      data: {
        message: '회원가입이 완료되었습니다.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        }
      }
    });

    console.log('🎉 [REGISTER] 회원가입 성공!');
    console.log('==============================');

  } catch (error) {
    console.log('❌ [REGISTER] 회원가입 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      ok: false,
      error: '회원가입 중 오류가 발생했습니다.'
    });
  }
});

/**
 * [POST] /auth/login/kakao
 */
router.post('/login/kakao', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: '카카오 액세스 토큰이 필요합니다.' });
    const tokens = await authService.loginKakao(token);
    res.status(200).json(tokens);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/refresh
 * 토큰 갱신
 */
router.post('/refresh', async (req, res) => {
  try {
    const headerToken = req.headers['authorization'];
    const bodyToken = req.body?.refreshToken;
    const tokens = await authService.refreshToken(headerToken || bodyToken);
    res.status(200).json({ ok: true, data: tokens });
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    res.status(401).json({ ok: false, error: { code: 'E_REFRESH_FAILED', message: '토큰 갱신에 실패했습니다.' } });
  }
});

/**
 * [POST] /auth/google-login-direct
 * 구글 로그인 - 직접 사용자 정보로 로그인
 */
router.post('/google-login-direct', async (req, res) => {
  console.log('==============================');
  console.log('[GOOGLE LOGIN DIRECT] 구글 로그인 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { googleId, email, name } = req.body;

    if (!googleId || !email || !name) {
      console.log('❌ [GOOGLE LOGIN DIRECT] 필수 필드 누락');
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    console.log('✅ [GOOGLE LOGIN DIRECT] 입력 검증 통과');
    console.log(`  🆔 Google ID: ${googleId}`);
    console.log(`  📧 이메일: ${email}`);
    console.log(`  👤 이름: ${name}`);

    const userInfo = {
      googleId,
      email,
      name,
      accessToken: 'mock_token_for_testing'
    };

    const result = await authService.loginGoogleWithVerifiedInfo(userInfo);

    if (result.success) {
      console.log('✅ [GOOGLE LOGIN DIRECT] 구글 로그인 성공');
      console.log(`  👤 사용자 ID: ${result.user.userId}`);
      console.log(`  📧 이메일: ${result.user.email}`);
      console.log(`  🆔 Google ID: ${result.user.googleId}`);

      res.status(200).json({
        message: '구글 로그인이 완료되었습니다.',
        user: result.user,
        tokens: result.tokens
      });
    } else {
      console.log('❌ [GOOGLE LOGIN DIRECT] 구글 로그인 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.log('❌ [GOOGLE LOGIN DIRECT] 구글 로그인 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/google-login
 * 구글 로그인 - 백엔드에서 Google OAuth 직접 처리
 */
router.post('/google-login', async (req, res) => {
  console.log('==============================');
  console.log('[GOOGLE LOGIN] 구글 로그인 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('📊 요청 헤더:', JSON.stringify(req.headers, null, 2));
  console.log('==============================');

  try {
    // 백엔드에서 Google OAuth 직접 처리
    console.log('🚀 [GOOGLE LOGIN] 백엔드에서 Google OAuth 처리 시작');

    const { clientId, platform } = req.body;
    console.log(`  📱 플랫폼: ${platform}`);
    console.log(`  🆔 클라이언트 ID: ${clientId}`);

    const result = await authService.handleGoogleOAuth(clientId, platform);

    if (result.success) {
      console.log('✅ [GOOGLE LOGIN] Google OAuth URL 생성 성공');
      console.log(`  🔗 Auth URL: ${result.authUrl}`);

      const responseData = {
        message: 'Google OAuth URL이 생성되었습니다.',
        authUrl: result.authUrl
      };

      console.log('📤 [GOOGLE LOGIN] 200 성공 응답 전송');
      console.log('📦 [GOOGLE LOGIN] 응답 데이터:', JSON.stringify(responseData, null, 2));
      res.status(200).json(responseData);
    } else {
      console.log('❌ [GOOGLE LOGIN] 구글 로그인 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error || '구글 로그인에 실패했습니다.',
        details: { type: 'google_oauth_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [GOOGLE LOGIN] 구글 로그인 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log(`  📝 스택 트레이스: ${error.stack}`);

    // Google 토큰 검증 오류 처리
    if (error.message.includes('Google token verification failed')) {
      console.log('🔍 [GOOGLE LOGIN] Google 토큰 검증 오류');
      res.status(401).json({
        error: 'Google 토큰이 유효하지 않습니다.',
        details: { type: 'google_token_verification_failed' }
      });
    } else if (error.name === 'SequelizeValidationError') {
      console.log('🔍 [GOOGLE LOGIN] 데이터베이스 검증 오류');
      console.log(`  📝 상세 오류: ${JSON.stringify(error.errors, null, 2)}`);
      res.status(400).json({
        error: '사용자 정보가 올바르지 않습니다.',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('🔍 [GOOGLE LOGIN] 데이터베이스 중복 오류');
      console.log(`  📝 중복 필드: ${error.fields.join(', ')}`);
      res.status(409).json({
        error: '이미 존재하는 계정입니다.',
        details: { duplicate: error.fields }
      });
    } else if (error.name === 'SequelizeConnectionError') {
      console.log('🔍 [GOOGLE LOGIN] 데이터베이스 연결 오류');
      res.status(500).json({
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details: { type: 'database_connection_error' }
      });
    } else {
      console.log('🔍 [GOOGLE LOGIN] 일반 오류');
      res.status(400).json({
        error: error.message,
        details: { type: 'general_error' }
      });
    }

    console.log('==============================');
  }
});

/**
 * [GET] /auth/google/callback
 * Google OAuth callback 처리
 */
router.get('/google/callback', async (req, res) => {
  console.log('==============================');
  console.log('[GOOGLE CALLBACK] Google OAuth callback 요청');
  console.log('📦 쿼리 파라미터:', JSON.stringify(req.query, null, 2));
  console.log('==============================');

  try {
    const { code, error } = req.query;

    if (error) {
      console.log('❌ [GOOGLE CALLBACK] Google OAuth 오류');
      console.log(`  📝 오류: ${error}`);
      return res.status(400).json({ error: 'Google OAuth 오류가 발생했습니다.' });
    }

    if (!code) {
      console.log('❌ [GOOGLE CALLBACK] 인증 코드 누락');
      return res.status(400).json({ error: '인증 코드가 필요합니다.' });
    }

    console.log('✅ [GOOGLE CALLBACK] 인증 코드 수신');
    console.log(`  🔑 인증 코드: ${code.substring(0, 20)}...`);

    // 인증 코드로 토큰 교환
    const tokenResult = await authService.exchangeGoogleCode(code);

    if (tokenResult.success) {
      console.log('✅ [GOOGLE CALLBACK] 토큰 교환 성공');
      console.log(`  👤 사용자 ID: ${tokenResult.user?.userId}`);
      console.log(`  📧 이메일: ${tokenResult.user?.email}`);

      // 연결 모드인지 확인 (URL 파라미터에서)
      const isLinkMode = req.query.mode === 'link';

      if (isLinkMode) {
        // 연결 모드: 구글 계정 정보 포함
        const redirectUrl = `exp://192.168.167.36:8081?success=true&mode=link&googleId=${tokenResult.user?.googleId}&googleEmail=${encodeURIComponent(tokenResult.user?.email)}&googleName=${encodeURIComponent(tokenResult.user?.name)}`;

        console.log('🔗 [GOOGLE CALLBACK] 연결 모드 리다이렉트 URL 생성');
        console.log(`  🔗 URL: ${redirectUrl}`);

        res.redirect(redirectUrl);
      } else {
        // 로그인 모드: 토큰 포함
        const accessToken = tokenResult.tokens?.accessToken;
        const refreshToken = tokenResult.tokens?.refreshToken;

        const redirectUrl = `exp://192.168.167.36:8081?success=true&userId=${tokenResult.user?.userId}&accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;

        console.log('🔗 [GOOGLE CALLBACK] 로그인 모드 리다이렉트 URL 생성');
        console.log(`  🔗 URL: ${redirectUrl}`);

        res.redirect(redirectUrl);
      }
    } else if (tokenResult.needsSignup) {
      console.log('👤 [GOOGLE CALLBACK] 회원가입 필요');
      console.log(`  📧 이메일: ${tokenResult.googleUserInfo?.email}`);
      console.log(`  👤 이름: ${tokenResult.googleUserInfo?.name}`);

      // 회원가입 화면으로 리다이렉트
      const redirectUrl = `exp://192.168.167.36:8081?needsSignup=true&googleEmail=${encodeURIComponent(tokenResult.googleUserInfo?.email)}&googleName=${encodeURIComponent(tokenResult.googleUserInfo?.name)}&googleId=${tokenResult.googleUserInfo?.googleId}`;

      console.log('🔗 [GOOGLE CALLBACK] 회원가입 필요 리다이렉트 URL 생성');
      console.log(`  🔗 URL: ${redirectUrl}`);

      res.redirect(redirectUrl);
    } else {
      console.log('❌ [GOOGLE CALLBACK] 토큰 교환 실패');
      console.log(`  📝 오류: ${tokenResult.error}`);
      res.redirect(`exp://192.168.167.36:8081?error=${encodeURIComponent(tokenResult.error)}`);
    }

  } catch (error) {
    console.log('❌ [GOOGLE CALLBACK] callback 처리 오류');
    console.log(`  📝 오류 메시지: ${error.message}`);
    res.redirect(`exp://localhost:19000?error=${encodeURIComponent('Google OAuth 처리 중 오류가 발생했습니다.')}`);
  }
});

/**
 * [POST] /auth/login/google
 */
router.post('/login/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: '구글 액세스 토큰이 필요합니다.' });
    const tokens = await authService.loginGoogle(token);
    res.status(200).json(tokens);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [GET] /auth/account
 */
router.get('/account', authMiddleware, async (req, res) => {
  console.log('==============================');
  console.log('[ACCOUNT] 계정 정보 요청');
  console.log(`  👤 사용자 ID: ${req.user.userId}`);
  console.log('==============================');

  try {
    const userInfo = await authService.getAccount(req.user.userId);

    console.log('✅ [ACCOUNT] 계정 정보 조회 성공');
    console.log(`  👤 이름: ${userInfo.name}`);
    console.log(`  📧 이메일: ${userInfo.email}`);
    console.log(`  🆔 사용자 ID: ${userInfo.userId}`);
    console.log('==============================');

    res.status(200).json(userInfo);
  } catch (error) {
    console.log('❌ [ACCOUNT] 계정 정보 조회 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(404).json({ error: error.message });
  }
});

/**
 * [PUT] /auth/account
 */
router.put('/account', authMiddleware, async (req, res) => {
  try {
    const updated = await authService.updateAccount(req.user.userId, req.body.username, req.body.major);
    res.status(200).json({ message: '회원 정보 수정 성공', user: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [DELETE] /auth/account
 */
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    await authService.deleteAccount(req.user.userId);
    res.status(200).json({ message: '회원 탈퇴 성공' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/email-verification
 */
router.post('/email-verification', async (req, res) => {
  try {
    await authService.sendEmailVerification(req.body.email);
    res.status(200).json({ message: '인증 메일 전송 성공' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [GET] /auth/email-duplication
 */
router.get('/email-duplication', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: '이메일을 입력하세요.' });
    const duplicated = await authService.checkEmailDuplication(email);
    res.status(200).json({ duplicated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/email-confirmation
 */
router.post('/email-confirmation', async (req, res) => {
  try {
    const success = await authService.confirmEmailCode(req.body.email, req.body.code);
    if (success) res.status(200).json({ message: '이메일 인증 완료' });
    else res.status(400).json({ error: '인증 코드가 일치하지 않습니다.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/find-id
 * 아이디 찾기 (전화번호 인증 후 이메일 찾기)
 */
router.post('/find-id', async (req, res) => {
  console.log('==============================');
  console.log('[FIND ID] 아이디 찾기 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { code } = req.body;



    if (!code) {
      console.log('❌ [FIND ID] 인증번호 누락');
      return res.status(400).json({ error: '인증번호가 필요합니다.' });
    }

    console.log('✅ [FIND ID] 입력 검증 통과');
    console.log(`  🔢 인증번호: ${code}`);

    // 이메일로 사용자 찾기 (전화번호 인증 대신 이메일 인증 사용)
    const authService = require('../service/authService');
    const email = await authService.recoverIdByEmail(code);

    console.log('✅ [FIND ID] 아이디 찾기 성공');
    console.log(`  📧 찾은 이메일: ${email}`);

    res.status(200).json({
      message: '아이디 찾기가 완료되었습니다.',
      email: email
    });

  } catch (error) {
    console.log('❌ [FIND ID] 아이디 찾기 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/find-password/send-code
 * 비밀번호 찾기 - 인증번호 발송
 */
router.post('/find-password/send-code', async (req, res) => {
  console.log('==============================');
  console.log('[FIND PASSWORD SEND] 비밀번호 찾기 인증번호 발송 요청');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { email } = req.body;

    if (!email) {
      console.log('❌ [FIND PASSWORD SEND] 이메일 누락');
      return res.status(400).json({ error: '이메일이 필요합니다.' });
    }

    console.log('✅ [FIND PASSWORD SEND] 입력 검증 통과');
    console.log(`  📧 이메일: ${email}`);

    // 이메일로 사용자 확인
    const authService = require('../service/authService');
    const user = await authService.findUserByEmail(email);

    if (!user) {
      console.log('❌ [FIND PASSWORD SEND] 해당 이메일로 가입된 사용자가 없음');
      return res.status(400).json({ error: '해당 이메일로 가입된 사용자가 없습니다.' });
    }

    console.log('✅ [FIND PASSWORD SEND] 사용자 확인 성공');
    console.log(`  👤 사용자 ID: ${user.userId}`);

    // 인증번호 발송 (기존 PhoneVerification 테이블 활용)
    const result = await authService.sendPasswordResetCode(email);

    if (result.success) {
      console.log('✅ [FIND PASSWORD SEND] 인증번호 발송 성공');
      res.status(200).json({
        message: '인증번호가 이메일로 발송되었습니다.',
        expiresAt: result.expiresAt
      });
    } else {
      console.log('❌ [FIND PASSWORD SEND] 인증번호 발송 실패');
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.log('❌ [FIND PASSWORD SEND] 비밀번호 찾기 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/find-password/reset
 * 비밀번호 찾기 - 인증번호 확인 및 새 비밀번호 설정
 */
router.post('/find-password/reset', async (req, res) => {
  console.log('==============================');
  console.log('[FIND PASSWORD RESET] 비밀번호 재설정 요청');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      console.log('❌ [FIND PASSWORD RESET] 필수 필드 누락');
      return res.status(400).json({ error: '이메일, 인증번호, 새 비밀번호가 필요합니다.' });
    }

    // 새 비밀번호 유효성 검사
    if (newPassword.length < 8) {
      console.log('❌ [FIND PASSWORD RESET] 새 비밀번호 길이 부족');
      return res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' });
    }

    console.log('✅ [FIND PASSWORD RESET] 입력 검증 통과');
    console.log(`  📧 이메일: ${email}`);
    console.log(`  🔑 새 비밀번호 길이: ${newPassword.length}자`);

    // 인증번호 확인 및 비밀번호 재설정
    const authService = require('../service/authService');
    const result = await authService.resetPasswordWithCode(email, code, newPassword);

    if (result.success) {
      console.log('✅ [FIND PASSWORD RESET] 비밀번호 재설정 성공');
      res.status(200).json({
        message: '비밀번호가 성공적으로 재설정되었습니다.',
        success: true
      });
    } else {
      console.log('❌ [FIND PASSWORD RESET] 비밀번호 재설정 실패');
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.log('❌ [FIND PASSWORD RESET] 비밀번호 재설정 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(400).json({ error: error.message });
  }
});

/**
 * [POST] /auth/link-google
 * 기존 계정과 구글 계정 연결
 */
router.post('/link-google', authMiddleware, async (req, res) => {
  console.log('==============================');
  console.log('[LINK GOOGLE] 구글 계정 연결 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { googleId, googleEmail, googleName } = req.body;
    const userId = req.user.userId;

    console.log('🔍 [LINK GOOGLE] 필수 필드 검증');
    console.log(`  🆔 Google ID: ${googleId} (${googleId ? '✅' : '❌'})`);
    console.log(`  📧 Google Email: ${googleEmail} (${googleEmail ? '✅' : '❌'})`);
    console.log(`  👤 Google Name: ${googleName} (${googleName ? '✅' : '❌'})`);
    console.log(`  👤 사용자 ID: ${userId} (${userId ? '✅' : '❌'})`);

    // 필수 필드 검증
    if (!googleId || !googleEmail || !googleName) {
      console.log('❌ [LINK GOOGLE] 필수 필드 누락');
      return res.status(400).json({
        error: '구글 계정 정보가 누락되었습니다.',
        details: { type: 'missing_google_info' }
      });
    }

    console.log('✅ [LINK GOOGLE] 입력 검증 통과');

    // 구글 계정 연결 서비스 호출
    const result = await authService.linkGoogleAccount(userId, { googleId, googleEmail, googleName });

    if (result.success) {
      console.log('✅ [LINK GOOGLE] 구글 계정 연결 성공');
      console.log(`  👤 사용자 ID: ${userId}`);
      console.log(`  🆔 Google ID: ${googleId}`);
      console.log('📤 [LINK GOOGLE] 200 성공 응답 전송');

      res.status(200).json({
        message: 'Google 계정이 성공적으로 연결되었습니다.',
        success: true,
        data: result.user
      });
    } else {
      console.log('❌ [LINK GOOGLE] 구글 계정 연결 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error,
        details: { type: 'google_link_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [LINK GOOGLE] 구글 계정 연결 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '구글 계정 연결 중 오류가 발생했습니다.',
      details: { type: 'server_error' }
    });
  }
});

/**
 * [POST] /auth/logout
 * 구글 로그아웃 (인증 없이 호출 가능)
 */
router.post('/logout', async (req, res) => {
  console.log('==============================');
  console.log('[LOGOUT] 로그아웃 요청 시작');
  console.log('==============================');

  try {
    // 세션 정리 (쿠키 삭제 등)
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    console.log('✅ [LOGOUT] 로그아웃 성공');
    console.log('📤 [LOGOUT] 200 성공 응답 전송');

    res.status(200).json({
      message: '로그아웃이 완료되었습니다.',
      success: true
    });
  } catch (error) {
    console.log('❌ [LOGOUT] 로그아웃 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '로그아웃 중 오류가 발생했습니다.',
      success: false
    });
  }
});

/**
 * [PUT] /auth/change-password
 * 비밀번호 변경
 */
router.put('/change-password', authMiddleware, async (req, res) => {
  console.log('==============================');
  console.log('[CHANGE PASSWORD] 비밀번호 변경 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // 필수 필드 검증
    if (!currentPassword || !newPassword) {
      console.log('❌ [CHANGE PASSWORD] 필수 필드 누락');
      console.log(`  🔑 현재 비밀번호: ${currentPassword ? '있음' : '없음'}`);
      console.log(`  🔑 새 비밀번호: ${newPassword ? '있음' : '없음'}`);
      return res.status(400).json({
        error: '현재 비밀번호와 새 비밀번호가 필요합니다.',
        details: { type: 'missing_fields' }
      });
    }

    // 새 비밀번호 유효성 검사
    if (newPassword.length < 8) {
      console.log('❌ [CHANGE PASSWORD] 새 비밀번호 길이 부족');
      console.log(`  📏 길이: ${newPassword.length}자`);
      return res.status(400).json({
        error: '새 비밀번호는 8자 이상이어야 합니다.',
        details: { type: 'password_too_short' }
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      console.log('❌ [CHANGE PASSWORD] 새 비밀번호에 대문자 없음');
      return res.status(400).json({
        error: '새 비밀번호는 대문자를 포함해야 합니다.',
        details: { type: 'password_no_uppercase' }
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      console.log('❌ [CHANGE PASSWORD] 새 비밀번호에 소문자 없음');
      return res.status(400).json({
        error: '새 비밀번호는 소문자를 포함해야 합니다.',
        details: { type: 'password_no_lowercase' }
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      console.log('❌ [CHANGE PASSWORD] 새 비밀번호에 숫자 없음');
      return res.status(400).json({
        error: '새 비밀번호는 숫자를 포함해야 합니다.',
        details: { type: 'password_no_number' }
      });
    }

    console.log('✅ [CHANGE PASSWORD] 입력 검증 통과');

    // 비밀번호 변경 서비스 호출
    const result = await authService.changePassword(userId, currentPassword, newPassword);

    if (result.success) {
      console.log('✅ [CHANGE PASSWORD] 비밀번호 변경 성공');
      console.log(`  👤 사용자 ID: ${userId}`);
      console.log('📤 [CHANGE PASSWORD] 200 성공 응답 전송');

      res.status(200).json({
        message: '비밀번호가 성공적으로 변경되었습니다.',
        success: true
      });
    } else {
      console.log('❌ [CHANGE PASSWORD] 비밀번호 변경 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error,
        details: { type: 'password_change_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [CHANGE PASSWORD] 비밀번호 변경 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    if (error.message === '현재 비밀번호가 올바르지 않습니다.') {
      res.status(400).json({
        error: '현재 비밀번호가 올바르지 않습니다.',
        details: { type: 'invalid_current_password' }
      });
    } else {
      res.status(500).json({
        error: '비밀번호 변경 중 오류가 발생했습니다.',
        details: { type: 'server_error' }
      });
    }
  }
});

/**
 * [PUT] /auth/update-profile
 * 프로필 정보 수정 (닉네임, 이름 등)
 */
router.put('/update-profile', authMiddleware, async (req, res) => {
  console.log('==============================');
  console.log('[UPDATE PROFILE] 프로필 수정 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { nickname, name, bio } = req.body;
    const userId = req.user.userId;

    // 수정할 필드가 하나도 없으면 에러
    if (!nickname && !name && !bio) {
      console.log('❌ [UPDATE PROFILE] 수정할 필드 없음');
      return res.status(400).json({
        error: '수정할 항목이 필요합니다.',
        details: { type: 'no_fields_to_update' }
      });
    }

    console.log('✅ [UPDATE PROFILE] 입력 검증 통과');

    // 프로필 수정 서비스 호출
    const result = await authService.updateProfile(userId, { nickname, name, bio });

    if (result.success) {
      console.log('✅ [UPDATE PROFILE] 프로필 수정 성공');
      console.log(`  👤 사용자 ID: ${userId}`);
      console.log('📤 [UPDATE PROFILE] 200 성공 응답 전송');

      res.status(200).json({
        message: '프로필이 성공적으로 수정되었습니다.',
        success: true,
        data: result.user
      });
    } else {
      console.log('❌ [UPDATE PROFILE] 프로필 수정 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error,
        details: { type: 'profile_update_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [UPDATE PROFILE] 프로필 수정 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '프로필 수정 중 오류가 발생했습니다.',
      details: { type: 'server_error' }
    });
  }
});

/**
 * [POST] /auth/find-id
 * 아이디 찾기
 */
router.post('/find-id', async (req, res) => {
  console.log('==============================');
  console.log('[FIND ID] 아이디 찾기 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { email } = req.body;

    console.log('🔍 [FIND ID] 필수 필드 검증');
    console.log(`  📧 이메일: ${email} (${email ? '✅' : '❌'})`);

    // 필수 필드 검증
    if (!email) {
      console.log('❌ [FIND ID] 이메일 누락');
      return res.status(400).json({ error: '이메일을 입력해주세요.' });
    }

    console.log('✅ [FIND ID] 입력 검증 통과');

    // 아이디 찾기 서비스 호출
    const result = await authService.findId(email);

    if (result.success) {
      console.log('✅ [FIND ID] 아이디 찾기 성공');
      console.log(`  📧 이메일: ${email}`);
      console.log('📤 [FIND ID] 200 성공 응답 전송');

      res.status(200).json({
        message: '아이디 정보가 이메일로 발송되었습니다.',
        success: true
      });
    } else {
      console.log('❌ [FIND ID] 아이디 찾기 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error,
        details: { type: 'find_id_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [FIND ID] 아이디 찾기 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '아이디 찾기 중 오류가 발생했습니다.',
      details: { type: 'server_error' }
    });
  }
});

/**
 * [POST] /auth/find-password
 * 비밀번호 찾기
 */
router.post('/find-password', async (req, res) => {
  console.log('==============================');
  console.log('[FIND PASSWORD] 비밀번호 찾기 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { email, userId } = req.body;

    console.log('🔍 [FIND PASSWORD] 필수 필드 검증');
    console.log(`  📧 이메일: ${email} (${email ? '✅' : '❌'})`);
    console.log(`  👤 아이디: ${userId} (${userId ? '✅' : '❌'})`);

    // 필수 필드 검증
    if (!email || !userId) {
      console.log('❌ [FIND PASSWORD] 필수 필드 누락');
      return res.status(400).json({ error: '이메일과 아이디를 모두 입력해주세요.' });
    }

    console.log('✅ [FIND PASSWORD] 입력 검증 통과');

    // 비밀번호 찾기 서비스 호출
    const result = await authService.findPassword(email, userId);

    if (result.success) {
      console.log('✅ [FIND PASSWORD] 비밀번호 찾기 성공');
      console.log(`  📧 이메일: ${email}`);
      console.log(`  👤 아이디: ${userId}`);
      console.log('📤 [FIND PASSWORD] 200 성공 응답 전송');

      res.status(200).json({
        message: '임시 비밀번호가 이메일로 발송되었습니다.',
        success: true
      });
    } else {
      console.log('❌ [FIND PASSWORD] 비밀번호 찾기 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error,
        details: { type: 'find_password_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [FIND PASSWORD] 비밀번호 찾기 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '비밀번호 찾기 중 오류가 발생했습니다.',
      details: { type: 'server_error' }
    });
  }
});

/**
 * [POST] /auth/link-google
 * 기존 계정과 구글 계정 연결
 */
router.post('/link-google', authMiddleware, async (req, res) => {
  console.log('==============================');
  console.log('[LINK GOOGLE] 구글 계정 연결 요청 시작');
  console.log('📦 요청 데이터:', JSON.stringify(req.body, null, 2));
  console.log('==============================');

  try {
    const { googleId, googleEmail, googleName } = req.body;
    const userId = req.user.userId;

    console.log('🔍 [LINK GOOGLE] 필수 필드 검증');
    console.log(`  🆔 Google ID: ${googleId} (${googleId ? '✅' : '❌'})`);
    console.log(`  📧 Google Email: ${googleEmail} (${googleEmail ? '✅' : '❌'})`);
    console.log(`  👤 Google Name: ${googleName} (${googleName ? '✅' : '❌'})`);
    console.log(`  👤 사용자 ID: ${userId} (${userId ? '✅' : '❌'})`);

    // 필수 필드 검증
    if (!googleId || !googleEmail || !googleName) {
      console.log('❌ [LINK GOOGLE] 필수 필드 누락');
      return res.status(400).json({
        error: '구글 계정 정보가 누락되었습니다.',
        details: { type: 'missing_google_info' }
      });
    }

    console.log('✅ [LINK GOOGLE] 입력 검증 통과');

    // 구글 계정 연결 서비스 호출
    const result = await authService.linkGoogleAccount(userId, { googleId, googleEmail, googleName });

    if (result.success) {
      console.log('✅ [LINK GOOGLE] 구글 계정 연결 성공');
      console.log(`  👤 사용자 ID: ${userId}`);
      console.log(`  🆔 Google ID: ${googleId}`);
      console.log('📤 [LINK GOOGLE] 200 성공 응답 전송');

      res.status(200).json({
        message: 'Google 계정이 성공적으로 연결되었습니다.',
        success: true,
        data: result.user
      });
    } else {
      console.log('❌ [LINK GOOGLE] 구글 계정 연결 실패');
      console.log(`  📝 오류: ${result.error}`);
      res.status(400).json({
        error: result.error,
        details: { type: 'google_link_failed' }
      });
    }

  } catch (error) {
    console.log('❌ [LINK GOOGLE] 구글 계정 연결 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '구글 계정 연결 중 오류가 발생했습니다.',
      details: { type: 'server_error' }
    });
  }
});

/**
 * [POST] /auth/logout
 * 구글 로그아웃 (인증 없이 호출 가능)
 */
router.post('/logout', async (req, res) => {
  console.log('==============================');
  console.log('[LOGOUT] 로그아웃 요청 시작');
  console.log('==============================');

  try {
    // 세션 정리 (쿠키 삭제 등)
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    console.log('✅ [LOGOUT] 로그아웃 성공');
    console.log('📤 [LOGOUT] 200 성공 응답 전송');

    res.status(200).json({
      message: '로그아웃이 완료되었습니다.',
      success: true
    });
  } catch (error) {
    console.log('❌ [LOGOUT] 로그아웃 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    res.status(500).json({
      error: '로그아웃 중 오류가 발생했습니다.',
      success: false
    });
  }
});



/**
 * [POST] /auth/validate-password
 * 현재 비밀번호 검증
 */
router.post('/validate-password', authMiddleware, async (req, res) => {
  console.log('==============================');
  console.log('[VALIDATE PASSWORD] 비밀번호 검증 요청');
  console.log('==============================');

  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '비밀번호를 입력해주세요.',
      });
    }

    // 비밀번호 검증 서비스 호출
    const isValid = await authService.validatePassword(userId, password);

    if (isValid) {
      console.log('✅ [VALIDATE PASSWORD] 비밀번호 검증 성공');
      res.status(200).json({
        success: true,
        message: '비밀번호가 올바릅니다.',
      });
    } else {
      console.log('❌ [VALIDATE PASSWORD] 비밀번호 검증 실패');
      res.status(400).json({
        success: false,
        message: '비밀번호가 올바르지 않습니다.',
      });
    }

  } catch (error) {
    console.log('❌ [VALIDATE PASSWORD] 서버 오류');
    console.log(`  📝 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
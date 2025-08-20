const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { User, RefreshToken, PhoneVerification, TermsAgreement } = require('../models');
const emailService = require('./emailService');
const smsService = require('./smsService');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const ACCESS_TOKEN_EXPIRATION = '1h';
const REFRESH_TOKEN_EXPIRATION = '7d';

// 회원가입: 새로운 구조에 맞게 업데이트
async function signup(signupData) {
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
  } = signupData;

  console.log('==============================');
  console.log('[SIGNUP SERVICE] 회원가입 서비스 시작');
  console.log(`  📧 이메일: ${email}`);
  console.log(`  👤 이름: ${name}`);
  console.log(`  🏷️ 닉네임: ${nickname}`);
  console.log(`  📅 생년월일: ${birth || '미입력'}`);
  console.log(`  📋 약관 동의: ${agreeTerms ? '이용약관✅' : '이용약관❌'} ${agreePrivacy ? '개인정보✅' : '개인정보❌'} ${agreeMicrophone ? '마이크✅' : '마이크❌'} ${agreeLocation ? '위치✅' : '위치❌'} ${agreeMarketing ? '마케팅✅' : '마케팅❌'}`);
  console.log('==============================');

  // 1. 이메일 중복 체크만 수행
  console.log('🔍 [SIGNUP SERVICE] 중복 체크 시작');

  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) {
    console.log('❌ [SIGNUP SERVICE] 이메일 중복');
    console.log(`  📧 중복 이메일: ${email}`);
    console.log(`  👤 기존 사용자 ID: ${existingEmail.id}`);
    throw new Error('이미 존재하는 이메일입니다.');
  }
  console.log('✅ [SIGNUP SERVICE] 이메일 중복 없음');

  console.log('✅ [SIGNUP SERVICE] 중복 체크 완료');

  // 3. 필수 약관 동의 확인
  if (!agreeTerms || !agreePrivacy || !agreeMicrophone || !agreeLocation) {
    console.log('❌ [SIGNUP] 약관 동의 실패 - 필수 약관 미동의');
    throw new Error('필수 약관에 동의해주세요.');
  }
  console.log('✅ [SIGNUP] 약관 동의 확인 완료');

  // 4. 비밀번호 해시
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  console.log('✅ [SIGNUP] 비밀번호 해시 완료');

  // 5. 트랜잭션으로 회원 생성 및 약관 동의 저장
  console.log('🚀 [SIGNUP SERVICE] 트랜잭션 시작');
  const transaction = await require('../models').sequelize.transaction();

  try {
    // 5-1. 회원 생성
    console.log('👤 [SIGNUP SERVICE] 사용자 생성 시작');
    const userData = {
      email,
      passwordHash: hashed,
      name,
      nickname,
      birth: birth ? new Date(birth) : null,
      provider: 'local'
    };
    console.log('📦 [SIGNUP SERVICE] 사용자 데이터:', JSON.stringify(userData, null, 2));

    const user = await User.create(userData, { transaction });
    console.log('✅ [SIGNUP SERVICE] 사용자 생성 완료');
    console.log(`  👤 사용자 ID: ${user.id}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  📧 이메일 인증: ${user.emailVerified ? '완료' : '미완료'}`);

    // 5-2. 약관 동의 내역 저장
    console.log('📋 [SIGNUP SERVICE] 약관 동의 내역 저장 시작');
    const termsData = {
      userId: user.id,
      termsOfService: !!agreeTerms,
      privacyPolicy: !!agreePrivacy,
      microphonePermission: !!agreeMicrophone,
      locationPermission: !!agreeLocation,
      marketingConsent: !!agreeMarketing,
      created_at: new Date()
    };
    console.log('📦 [SIGNUP SERVICE] 약관 동의 데이터:', JSON.stringify(termsData, null, 2));

    await TermsAgreement.create(termsData, { transaction });
    console.log('✅ [SIGNUP SERVICE] 약관 동의 내역 저장 완료');

    // 5-3. (SMS 비활성화) 휴대폰 인증 관련 로직은 건너뜁니다
    console.log('📱 [SIGNUP SERVICE] (SKIP) 휴대폰 인증 내역 업데이트 스킵');

    // 5-4. 환영 메일 발송
    console.log('📧 [SIGNUP SERVICE] 환영 메일 발송 시작');
    await sendWelcomeEmail(email, name);
    console.log('✅ [SIGNUP SERVICE] 환영 메일 발송 완료');

    // 5-5. 자동 로그인 토큰 발급
    console.log('🔑 [SIGNUP SERVICE] 토큰 발급 시작');
    const tokens = generateTokens(user.id);
    console.log('✅ [SIGNUP SERVICE] 토큰 생성 완료');

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiresAt()
    }, { transaction });
    console.log('✅ [SIGNUP SERVICE] 리프레시 토큰 저장 완료');

    console.log('💾 [SIGNUP SERVICE] 트랜잭션 커밋 시작');
    await transaction.commit();
    console.log('✅ [SIGNUP SERVICE] 트랜잭션 커밋 완료');

    console.log('🎉 [SIGNUP SERVICE] 회원가입 성공!');
    console.log(`  👤 사용자 ID: ${user.id}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  📧 이메일 인증: ${user.emailVerified ? '완료' : '미완료'}`);
    console.log(`  🔑 액세스 토큰: ${tokens.accessToken ? '발급됨' : '발급안됨'}`);
    console.log(`  🔄 리프레시 토큰: ${tokens.refreshToken ? '발급됨' : '발급안됨'}`);
    console.log('==============================');

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      birth: user.birth,
      emailVerified: user.emailVerified,
      createdAt: user.created_at,
      tokens
    };

  } catch (error) {
    console.log('❌ [SIGNUP SERVICE] 트랜잭션 롤백 시작');
    await transaction.rollback();
    console.log('✅ [SIGNUP SERVICE] 트랜잭션 롤백 완료');
    console.log('❌ [SIGNUP SERVICE] 회원가입 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log(`  📝 스택 트레이스: ${error.stack}`);
    console.log('==============================');
    throw error;
  }
}

async function findOrCreateUser(email, username, provider) {
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      email,
      username,
      password: null,
      provider
    });
  }
  return user;
}

async function signupKakao(token) {
  if (!token) throw new Error('카카오 액세스 토큰이 필요합니다.');
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!res.ok) throw new Error('카카오 API 요청 실패');
  const info = await res.json();
  const email = info.kakao_account?.email || `kakao_${info.id}@example.com`;
  const name = info.properties?.nickname || '카카오사용자';
  const user = await findOrCreateUser(email, name, 'kakao');
  return { userId: user.id, email: user.email, username: user.username, provider: user.provider, createdAt: user.createdAt };
}

async function signupGoogle(token) {
  if (!token) throw new Error('구글 액세스 토큰이 필요합니다.');
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('구글 API 요청 실패');
  const info = await res.json();
  const email = info.email || (() => { throw new Error('이메일 정보가 없습니다.'); })();
  const name = info.name || '구글사용자';
  const user = await findOrCreateUser(email, name, 'google');
  return { userId: user.id, email: user.email, username: user.username, provider: user.provider, createdAt: user.createdAt };
}

function generateTokens(userId) {
  const access = jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
  const refresh = jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
  return { accessToken: access, refreshToken: refresh };
}

function getRefreshTokenExpiresAt() {
  // 7d 등 REFRESH_TOKEN_EXPIRATION을 Date로 변환
  const now = new Date();
  if (REFRESH_TOKEN_EXPIRATION.endsWith('d')) {
    const days = parseInt(REFRESH_TOKEN_EXPIRATION);
    now.setDate(now.getDate() + days);
    return now;
  } else if (REFRESH_TOKEN_EXPIRATION.endsWith('h')) {
    const hours = parseInt(REFRESH_TOKEN_EXPIRATION);
    now.setHours(now.getHours() + hours);
    return now;
  }
  // 기본 7일
  now.setDate(now.getDate() + 7);
  return now;
}

async function login(email, password) {
  console.log('==============================');
  console.log('[LOGIN] 로그인 시도');
  console.log(`  📧 이메일: ${email}`);
  console.log('==============================');

  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.log('❌ [LOGIN] 사용자를 찾을 수 없습니다');
    throw new Error('사용자를 찾을 수 없습니다.');
  }
  console.log('✅ [LOGIN] 사용자 찾기 완료 - ID:', user.id);

  if (!user.passwordHash) {
    console.log('❌ [LOGIN] 소셜 계정은 비밀번호 로그인 불가');
    throw new Error('소셜 계정은 비밀번호 로그인 불가');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    console.log('❌ [LOGIN] 비밀번호가 일치하지 않습니다');
    throw new Error('비밀번호가 일치하지 않습니다.');
  }
  console.log('✅ [LOGIN] 비밀번호 확인 완료');

  const tokens = generateTokens(user.id);
  await RefreshToken.create({
    token: tokens.refreshToken,
    userId: user.id,
    expiresAt: getRefreshTokenExpiresAt()
  });

  console.log('🎉 [LOGIN] 로그인 성공!');
  console.log(`  👤 사용자 ID: ${user.id}`);
  console.log(`  📧 이메일: ${user.email}`);
  console.log(`  👤 이름: ${user.name}`);
  console.log('==============================');

  return tokens;
}

async function loginKakao(token) {
  const u = await signupKakao(token);
  const tokens = generateTokens(u.userId);
  await RefreshToken.create({ token: tokens.refreshToken, userId: u.userId });
  return tokens;
}

async function loginGoogle(token) {
  const u = await signupGoogle(token);
  const tokens = generateTokens(u.userId);
  await RefreshToken.create({ token: tokens.refreshToken, userId: u.userId });
  return tokens;
}

// Google ID Token 검증
async function verifyGoogleIdToken(idToken) {
  console.log('==============================');
  console.log('[GOOGLE TOKEN VERIFICATION] Google ID Token 검증 시작');
  console.log(`  🆔 ID Token 길이: ${idToken.length}자`);
  console.log(`  🆔 ID Token 앞부분: ${idToken.substring(0, 50)}...`);
  console.log('==============================');

  try {
    // Google의 tokeninfo 엔드포인트로 ID Token 검증
    const googleApiUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    console.log('🔗 [GOOGLE TOKEN VERIFICATION] Google API 호출 시작');
    console.log(`  📡 API URL: ${googleApiUrl}`);

    const response = await fetch(googleApiUrl);

    console.log('📊 [GOOGLE TOKEN VERIFICATION] Google API 응답 수신');
    console.log(`  📊 상태 코드: ${response.status}`);
    console.log(`  📝 상태 텍스트: ${response.statusText}`);
    console.log(`  📋 응답 헤더: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

    if (!response.ok) {
      console.log('❌ [GOOGLE TOKEN VERIFICATION] Google API 응답 실패');
      const errorText = await response.text();
      console.log(`  📝 에러 응답: ${errorText}`);
      return null;
    }

    const tokenInfo = await response.json();

    console.log('✅ [GOOGLE TOKEN VERIFICATION] Google API 응답 성공');
    console.log('📦 [GOOGLE TOKEN VERIFICATION] 토큰 정보:', JSON.stringify(tokenInfo, null, 2));
    console.log(`  🆔 Google ID: ${tokenInfo.sub}`);
    console.log(`  📧 이메일: ${tokenInfo.email}`);
    console.log(`  👤 이름: ${tokenInfo.name}`);
    console.log(`  🖼️ 프로필 사진: ${tokenInfo.picture ? '있음' : '없음'}`);
    console.log(`  ⏰ 발급 시각: ${tokenInfo.iat}`);
    console.log(`  ⏰ 만료 시각: ${tokenInfo.exp}`);

    // 토큰 만료 확인
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(`  ⏰ 현재 시각: ${currentTime}`);

    if (tokenInfo.exp && currentTime > tokenInfo.exp) {
      console.log('❌ [GOOGLE TOKEN VERIFICATION] 토큰 만료');
      console.log(`  ⏰ 현재 시각: ${currentTime}`);
      console.log(`  ⏰ 만료 시각: ${tokenInfo.exp}`);
      console.log(`  ⏰ 차이: ${currentTime - tokenInfo.exp}초`);
      return null;
    }

    console.log('✅ [GOOGLE TOKEN VERIFICATION] 토큰 유효성 검증 완료');
    console.log('==============================');
    return tokenInfo;

  } catch (error) {
    console.log('❌ [GOOGLE TOKEN VERIFICATION] 검증 중 오류 발생');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log(`  📝 스택 트레이스: ${error.stack}`);
    console.log('==============================');
    return null;
  }
}

// 구글 사용자 정보로 로그인 (검증된 정보 사용)
async function loginGoogleWithVerifiedInfo(userInfo) {
  console.log('==============================');
  console.log('[GOOGLE LOGIN SERVICE] 구글 로그인 서비스 시작');
  console.log('📦 [GOOGLE LOGIN SERVICE] 입력 데이터:', JSON.stringify(userInfo, null, 2));
  console.log(`  🆔 Google ID: ${userInfo.googleId}`);
  console.log(`  📧 이메일: ${userInfo.email}`);
  console.log(`  👤 이름: ${userInfo.name}`);
  console.log(`  🖼️ 프로필 사진: ${userInfo.picture ? '있음' : '없음'}`);
  console.log(`  🔑 액세스 토큰: ${userInfo.accessToken ? '있음' : '없음'}`);
  console.log('==============================');

  try {
    // 입력 데이터 검증
    console.log('🔍 [GOOGLE LOGIN SERVICE] 입력 데이터 검증');
    if (!userInfo.googleId || !userInfo.email || !userInfo.name) {
      const missingFields = [];
      if (!userInfo.googleId) missingFields.push('googleId');
      if (!userInfo.email) missingFields.push('email');
      if (!userInfo.name) missingFields.push('name');

      console.log(`❌ [GOOGLE LOGIN SERVICE] 필수 필드 누락: ${missingFields.join(', ')}`);
      throw new Error(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`);
    }
    console.log('✅ [GOOGLE LOGIN SERVICE] 입력 데이터 검증 통과');

    // 기존 사용자 확인 (이메일 또는 Google ID로 검색)
    console.log('🔍 [GOOGLE LOGIN SERVICE] 기존 사용자 확인 시작');
    console.log(`  📧 검색 이메일: ${userInfo.email}`);
    console.log(`  🆔 검색 Google ID: ${userInfo.googleId}`);

    let user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: userInfo.email },
          { googleId: userInfo.googleId }
        ]
      }
    });

    if (!user) {
      console.log('👤 [GOOGLE LOGIN SERVICE] 기존 사용자 없음 - 회원가입 필요');
      console.log(`  📧 이메일: ${userInfo.email}`);
      console.log(`  👤 이름: ${userInfo.name}`);
      console.log(`  🆔 Google ID: ${userInfo.googleId}`);

      // 회원가입이 필요한 신호 반환
      return {
        success: false,
        needsSignup: true,
        googleUserInfo: {
          email: userInfo.email,
          name: userInfo.name,
          googleId: userInfo.googleId,
          picture: userInfo.picture
        },
        message: '해당 구글 계정으로 가입된 사용자가 없습니다. 회원가입을 진행해주세요.'
      };
    } else {
      console.log('✅ [GOOGLE LOGIN SERVICE] 기존 사용자 발견');
      console.log(`  👤 사용자 ID: ${user.id}`);
      console.log(`  📧 이메일: ${user.email}`);
      console.log(`  👤 이름: ${user.name}`);
      console.log(`  🆔 기존 Google ID: ${user.googleId || '없음'}`);
      console.log(`  🔧 제공자: ${user.provider || '없음'}`);

      // 구글 ID 업데이트 (항상 실제 Google ID로 업데이트)
      console.log('🔄 [GOOGLE LOGIN SERVICE] Google ID 업데이트 시작');
      console.log(`  🆔 기존 Google ID: ${user.googleId || '없음'}`);
      console.log(`  🆔 새로운 Google ID: ${userInfo.googleId}`);

      try {
        await user.update({
          googleId: userInfo.googleId,
          picture: userInfo.picture || user.picture,
          provider: 'google'
        });
        console.log('✅ [GOOGLE LOGIN SERVICE] Google ID 업데이트 완료');
      } catch (updateError) {
        console.log('❌ [GOOGLE LOGIN SERVICE] Google ID 업데이트 실패');
        console.log(`  📝 오류 메시지: ${updateError.message}`);
        throw updateError;
      }
    }

    // 토큰 생성
    console.log('🔑 [GOOGLE LOGIN SERVICE] 토큰 생성 시작');
    const tokens = generateTokens(user.id);
    console.log('✅ [GOOGLE LOGIN SERVICE] 토큰 생성 완료');
    console.log(`  🔑 액세스 토큰 길이: ${tokens.accessToken.length}자`);
    console.log(`  🔄 리프레시 토큰 길이: ${tokens.refreshToken.length}자`);

    // 리프레시 토큰 저장
    console.log('💾 [GOOGLE LOGIN SERVICE] 리프레시 토큰 저장 시작');
    try {
      await RefreshToken.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiresAt()
      });
      console.log('✅ [GOOGLE LOGIN SERVICE] 리프레시 토큰 저장 완료');
    } catch (tokenError) {
      console.log('❌ [GOOGLE LOGIN SERVICE] 리프레시 토큰 저장 실패');
      console.log(`  📝 오류 메시지: ${tokenError.message}`);
      throw new Error('토큰 저장에 실패했습니다.');
    }

    console.log('🎉 [GOOGLE LOGIN SERVICE] 구글 로그인 성공!');
    console.log(`  👤 사용자 ID: ${user.id}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  👤 이름: ${user.name}`);
    console.log(`  🆔 Google ID: ${user.googleId}`);
    console.log(`  🖼️ 프로필 사진: ${user.picture ? '있음' : '없음'}`);
    console.log(`  📧 이메일 인증: ${user.emailVerified ? '완료' : '미완료'}`);
    console.log(`  🔧 제공자: ${user.provider}`);
    console.log(`  🔑 액세스 토큰: ${tokens.accessToken ? '발급됨' : '발급안됨'}`);
    console.log(`  🔄 리프레시 토큰: ${tokens.refreshToken ? '발급됨' : '발급안됨'}`);
    console.log('==============================');

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      googleId: user.googleId,
      picture: user.picture,
      emailVerified: user.emailVerified,
      tokens
    };

  } catch (error) {
    console.log('❌ [GOOGLE LOGIN SERVICE] 구글 로그인 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log(`  📝 스택 트레이스: ${error.stack}`);
    console.log('==============================');
    throw error;
  }
}

async function getAccount(userId) {
  console.log('==============================');
  console.log('[GET ACCOUNT] 사용자 정보 조회');
  console.log(`  🆔 요청된 사용자 ID: ${userId}`);
  console.log('==============================');

  const u = await User.findByPk(userId);

  if (!u) {
    console.log('❌ [GET ACCOUNT] 사용자를 찾을 수 없음');
    console.log(`  🆔 조회 시도한 ID: ${userId}`);
    console.log('==============================');
    throw new Error('유효하지 않은 사용자입니다.');
  }

  console.log('✅ [GET ACCOUNT] 사용자 정보 조회 성공');
  console.log(`  👤 이름: ${u.name}`);
  console.log(`  🏷️ 닉네임: ${u.nickname || 'N/A'}`);
  console.log(`  📧 이메일: ${u.email}`);
  console.log(`  🆔 사용자 ID: ${u.id}`);
  console.log(`  📅 생성일: ${u.created_at}`);
  console.log('==============================');

  return {
    userId: u.id,
    email: u.email,
    name: u.name,
    nickname: u.nickname,
    createdAt: u.created_at,
    updatedAt: u.updated_at
  };
}

async function updateAccount(userId, username, major) {
  const u = await User.findByPk(userId);
  if (!u) throw new Error('유효하지 않은 사용자입니다.');
  if (username?.trim()) u.username = username;
  if (major?.trim()) u.major = major;
  await u.save();
  return { userId: u.id, username: u.username, major: u.major, updatedAt: u.updatedAt };
}

async function deleteAccount(userId) {
  const u = await User.findByPk(userId);
  if (!u) throw new Error('유효하지 않은 사용자입니다.');
  await RefreshToken.destroy({ where: { userId } });
  await u.destroy();
  return true;
}

async function sendEmailVerification(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  // 기존 인증 정보 삭제
  // await EmailVerification.destroy({ where: { email } }); // 이 부분은 제거됨

  // 새로운 인증 정보 생성
  // await EmailVerification.create({ // 이 부분은 제거됨
  //   email,
  //   code,
  //   expiresAt: expires,
  //   isVerified: false
  // });

  // 이메일 발송
  const emailHtml = emailService.createVerificationEmail(code);
  await emailService.sendEmail(email, '이메일 인증 코드', emailHtml);

  return true;
}

async function confirmEmailCode(email, code) {
  // const rec = await EmailVerification.findOne({ where: { email } }); // 이 부분은 제거됨
  // if (!rec || new Date() > rec.expiresAt || rec.code !== code) {
  //   return false;
  // }

  // 인증 성공 시 isVerified를 true로 설정
  // await rec.update({ isVerified: true }); // 이 부분은 제거됨

  return true;
}

async function checkEmailDuplication(email) {
  return !!await User.findOne({ where: { email } });
}

async function sendPasswordReset(email) {
  const u = await User.findOne({ where: { email } });
  if (!u) throw new Error('이메일을 찾을 수 없습니다.');
  const token = crypto.randomBytes(20).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  // await EmailVerification.upsert({ email, code: token, expiresAt: expires }); // 이 부분은 제거됨
  console.log(`이메일 ${email}로 비밀번호 재설정 토큰 ${token} 발송`);
  return true;
}

async function verifyPhoneNumber(phone) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`휴대폰 ${phone}으로 인증코드 ${code} 발송`);
  return true;
}

async function issueToken(refresh_token, userId) {
  const rec = await RefreshToken.findOne({ where: { token: refresh_token } });
  if (!rec) throw new Error('유효하지 않은 refresh token입니다.');
  if (rec.userId !== userId) throw new Error('권한 없음');
  const { userId: tokenUserId } = jwt.verify(refresh_token, JWT_SECRET);
  await rec.destroy();
  const newTokens = generateTokens(tokenUserId);
  await RefreshToken.create({ token: newTokens.refreshToken, userId: tokenUserId, expiresAt: getRefreshTokenExpiresAt() });
  return newTokens;
}

async function logout(refresh_token, userId) {
  const rec = await RefreshToken.findOne({ where: { token: refresh_token } });
  if (!rec) throw new Error('유효하지 않은 refresh token입니다.');
  if (rec.userId !== userId) throw new Error('권한 없음');
  await rec.destroy();
  return { message: '로그아웃 완료' };
}

async function recoverIdByPhone(phone) {
  console.log('==============================');
  console.log('[RECOVER ID] 아이디 찾기 시작');
  console.log(`  📱 원본 휴대폰 번호: ${phone}`);
  console.log('==============================');

  // 휴대폰 번호 정규화 (하이픈 제거 후 E.164 형식으로 변환)
  let normalizedPhone = phone.replace(/-/g, ''); // 하이픈 제거
  if (normalizedPhone.startsWith('010') && normalizedPhone.length === 11) {
    const remaining = normalizedPhone.slice(3); // 010 제거
    normalizedPhone = `+8210${remaining}`;
  }

  console.log(`  📱 정규화된 휴대폰 번호: ${normalizedPhone}`);

  // 여러 형식으로 검색 시도
  const searchConditions = [
    { phone: phone }, // 원본 번호
    { phone: normalizedPhone }, // 정규화된 번호
    { phone: phone.replace(/-/g, '') }, // 하이픈만 제거한 번호
    { phone: `+8210${phone.replace(/-/g, '').slice(3)}` }, // E.164 형식
    { phone: `010${phone.replace(/-/g, '').slice(3)}` }, // 010 + 나머지
  ];

  console.log('🔍 [RECOVER ID] 검색 조건들:');
  searchConditions.forEach((condition, index) => {
    console.log(`  ${index + 1}. ${JSON.stringify(condition)}`);
  });

  const user = await User.findOne({
    where: {
      [require('sequelize').Op.or]: searchConditions
    }
  });

  if (!user) {
    console.log('❌ [RECOVER ID] 사용자를 찾을 수 없음');
    console.log(`  📱 검색한 번호들:`);
    searchConditions.forEach((condition, index) => {
      console.log(`    ${index + 1}. ${condition.phone}`);
    });
    throw new Error('등록된 번호가 없습니다.');
  }

  console.log('✅ [RECOVER ID] 사용자 찾기 성공');
  console.log(`  📧 찾은 이메일: ${user.email}`);
  console.log(`  📱 DB에 저장된 번호: ${user.phone}`);
  console.log('==============================');

  return user.email;
}

async function recoverPasswordByEmail(email) {
  return await sendPasswordReset(email);
}

async function registerSocialUser(username, major) {
  const u = await User.create({ email: `social_${Date.now()}@example.com`, username, major, password: null, provider: 'social' });
  return { userId: u.id, username: u.username, major: u.major, createdAt: u.createdAt };
}

// 환영 메일 발송
async function sendWelcomeEmail(email, name) {
  const html = `<h1>${name}님, 환영합니다!</h1><p>회원가입을 축하합니다.</p>`;
  await emailService.sendEmail(email, '환영합니다!', html);
}

// 휴대폰 인증번호 발송 및 저장
async function sendPhoneVerification(phone) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3 * 60 * 1000); // 3분 유효

  // 휴대폰 번호 정규화 (하이픈 제거)
  const normalizedPhone = phone.replace(/-/g, '');

  // 기존 인증 내역 삭제 (원본과 정규화된 번호 모두)
  await PhoneVerification.destroy({
    where: {
      [require('sequelize').Op.or]: [
        { phone: phone },
        { phone: normalizedPhone }
      ]
    }
  });

  // 새 인증번호 저장 (정규화된 번호로 저장)
  await PhoneVerification.create({
    phone: normalizedPhone,
    code,
    expiresAt: expires,
    isVerified: false,
    verifiedAt: null
  });

  // 명확한 로그 추가
  console.log('==============================');
  console.log(`[PHONE VERIFICATION] 인증번호 발송`);
  console.log(`  📱 전화번호: ${phone}`);
  console.log(`  🔢 인증번호: ${code}`);
  console.log(`  ⏰ 만료시각: ${expires.toISOString()}`);
  console.log('==============================');

  // 개발용 인증번호 출력 (항상 표시)
  console.log('🎯 [DEV] 인증번호 확인용:');
  console.log(`  📱 전화번호: ${phone}`);
  console.log(`  🔢 인증번호: ${code}`);
  console.log('🎯 [DEV] 위 인증번호를 앱에서 입력하세요!');
  console.log('==============================');

  // 실제 SMS 발송 (환경변수로 제어)
  console.log('🔧 [SMS] 환경변수 확인:', {
    ENABLE_SMS: process.env.ENABLE_SMS,
    NODE_ENV: process.env.NODE_ENV,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '설정됨' : '미설정',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '설정됨' : '미설정',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
  });

  if (process.env.ENABLE_SMS === 'true' || process.env.ENABLE_SMS === true) {
    try {
      console.log('📱 [SMS] 실제 SMS 발송 시도');
      const smsResult = await smsService.sendVerificationCode(phone, code);

      if (smsResult.success) {
        console.log('✅ [SMS] 실제 SMS 발송 성공');
        console.log(`  📱 수신번호: ${phone}`);
        console.log(`  🔢 인증번호: ${code}`);
        console.log(`  📋 메시지 ID: ${smsResult.sid || smsResult.messageId || 'N/A'}`);
      } else {
        console.error('❌ [SMS] SMS 발송 실패:', smsResult.error || smsResult.message);
        // SMS 실패해도 DB에는 저장되어 있으므로 계속 진행
      }
    } catch (error) {
      console.error('❌ [SMS] SMS 발송 중 예외 발생:', error.message);
      console.error('  📝 상세 에러:', error);
      // SMS 실패해도 DB에는 저장되어 있으므로 계속 진행
    }
  } else {
    console.log('💡 [SMS] SMS 발송 비활성화 (개발 모드)');
    console.log(`  🔧 ENABLE_SMS: ${process.env.ENABLE_SMS}`);
  }

  return { success: true, expiresAt: expires };
}

// 휴대폰 인증번호 검증
async function confirmPhoneCode(phone, code) {
  console.log('==============================');
  console.log('[SMS VERIFY] 인증번호 검증 시작');
  console.log(`  📱 전화번호: ${phone}`);
  console.log(`  🔢 입력된 인증번호: ${code}`);
  console.log('==============================');

  // 휴대폰 번호 정규화 (하이픈 제거)
  const normalizedPhone = phone.replace(/-/g, '');

  const verification = await PhoneVerification.findOne({
    where: {
      [require('sequelize').Op.or]: [
        { phone: phone }, // 원본 번호
        { phone: normalizedPhone }, // 정규화된 번호
        { phone: phone.replace(/-/g, '') }, // 하이픈만 제거한 번호
        { phone: `+8210${phone.replace(/-/g, '').slice(3)}` }, // E.164 형식
        { phone: `010${phone.replace(/-/g, '').slice(3)}` }, // 010 + 나머지
      ],
      code,
      isVerified: false,
      expiresAt: { [require('sequelize').Op.gt]: new Date() }
    }
  });

  if (!verification) {
    console.log('❌ [SMS VERIFY] 인증번호 검증 실패');
    console.log('  📝 사유: 인증번호가 올바르지 않거나 만료됨');
    return { success: false, message: '인증번호가 올바르지 않거나 만료되었습니다.' };
  }

  // 인증 성공 시 상태 업데이트
  await verification.update({
    isVerified: true,
    verifiedAt: new Date()
  });

  console.log('✅ [SMS VERIFY] 인증번호 검증 성공');
  console.log(`  📱 휴대폰: ${phone}`);
  console.log(`  ⏰ 인증 완료 시각: ${new Date().toISOString()}`);
  console.log('==============================');

  return { success: true, message: '인증이 완료되었습니다.' };
}

// 휴대폰 인증 상태 확인
async function checkPhoneVerification(phone) {
  const verification = await PhoneVerification.findOne({
    where: {
      phone,
      isVerified: true,
      expiresAt: { [require('sequelize').Op.gt]: new Date() }
    }
  });

  return !!verification;
}

// 비밀번호 변경
async function changePassword(userId, currentPassword, newPassword) {
  try {
    console.log('==============================');
    console.log('[CHANGE PASSWORD] 비밀번호 변경 서비스 시작');
    console.log(`  👤 사용자 ID: ${userId}`);
    console.log('==============================');

    // 사용자 조회
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('❌ [CHANGE PASSWORD] 사용자를 찾을 수 없습니다');
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      };
    }

    // 소셜 계정인지 확인
    if (!user.passwordHash) {
      console.log('❌ [CHANGE PASSWORD] 소셜 계정은 비밀번호 변경 불가');
      return {
        success: false,
        error: '소셜 계정은 비밀번호 변경이 불가능합니다.'
      };
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      console.log('❌ [CHANGE PASSWORD] 현재 비밀번호가 올바르지 않습니다');
      return {
        success: false,
        error: '현재 비밀번호가 올바르지 않습니다.'
      };
    }

    // 새 비밀번호 해시화
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 비밀번호 업데이트
    await user.update({
      passwordHash: hashedNewPassword
    });

    console.log('✅ [CHANGE PASSWORD] 비밀번호 변경 성공');
    console.log(`  👤 사용자 ID: ${userId}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log('==============================');

    return {
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    };

  } catch (error) {
    console.log('❌ [CHANGE PASSWORD] 비밀번호 변경 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    return {
      success: false,
      error: '비밀번호 변경 중 오류가 발생했습니다.'
    };
  }
}

// 프로필 수정
async function updateProfile(userId, data) {
  try {
    console.log('==============================');
    console.log('[UPDATE PROFILE] 프로필 수정 서비스 시작');
    console.log(`  👤 사용자 ID: ${userId}`);
    console.log(`  📦 수정 데이터:`, data);
    console.log('==============================');

    // 사용자 조회
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('❌ [UPDATE PROFILE] 사용자를 찾을 수 없습니다');
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      };
    }

    // 수정할 필드 준비
    const fieldsToUpdate = {};
    if (data.nickname) fieldsToUpdate.nickname = data.nickname;
    if (data.name) fieldsToUpdate.name = data.name;
    if (data.phone) fieldsToUpdate.phone = data.phone;
    if (data.bio) fieldsToUpdate.bio = data.bio;

    // 필드가 하나도 없으면 에러
    if (Object.keys(fieldsToUpdate).length === 0) {
      console.log('❌ [UPDATE PROFILE] 수정할 필드 없음');
      return {
        success: false,
        error: '수정할 항목이 필요합니다.'
      };
    }

    // 프로필 업데이트
    await user.update(fieldsToUpdate);

    console.log('✅ [UPDATE PROFILE] 프로필 수정 성공');
    console.log(`  👤 사용자 ID: ${userId}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  🔄 수정된 필드: ${Object.keys(fieldsToUpdate).join(', ')}`);
    console.log('==============================');

    return {
      success: true,
      message: '프로필이 성공적으로 수정되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        phone: user.phone,
        bio: user.bio
      }
    };

  } catch (error) {
    console.log('❌ [UPDATE PROFILE] 프로필 수정 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    return {
      success: false,
      error: '프로필 수정 중 오류가 발생했습니다.'
    };
  }
}

// 구글 OAuth 직접 처리
async function handleGoogleOAuth(clientId, platform) {
  console.log('==============================');
  console.log('[GOOGLE OAUTH SERVICE] Google OAuth 직접 처리 시작');
  console.log(`  📱 플랫폼: ${platform}`);
  console.log(`  🆔 클라이언트 ID: ${clientId}`);
  console.log('==============================');

  try {
    // Google OAuth URL 생성 (웹 클라이언트용)
    const redirectUri = 'http://localhost:3000/auth/google/callback';
    const scope = 'openid profile email';
    const responseType = 'code';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&prompt=select_account`;

    console.log('🔗 [GOOGLE OAUTH SERVICE] Google OAuth URL 생성');
    console.log(`  🆔 Client ID: ${clientId}`);
    console.log(`  🔗 Redirect URI: ${redirectUri}`);
    console.log(`  📋 Scope: ${scope}`);
    console.log(`  🔗 Auth URL: ${authUrl}`);

    // 실제로는 여기서 브라우저를 열거나 리다이렉트해야 하지만,
    // 현재 구조에서는 프론트엔드에서 처리하는 것이 더 적합합니다.
    // 따라서 임시로 성공 응답을 반환합니다.

    console.log('✅ [GOOGLE OAUTH SERVICE] Google OAuth 처리 완료');
    return {
      success: true,
      authUrl: authUrl,
      message: 'Google OAuth URL이 생성되었습니다.',
      user: null,
      tokens: null
    };

  } catch (error) {
    console.log('❌ [GOOGLE OAUTH SERVICE] Google OAuth 처리 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');
    return {
      success: false,
      error: 'Google OAuth 처리 중 오류가 발생했습니다.'
    };
  }
}

// Google 인증 코드로 토큰 교환
async function exchangeGoogleCode(code) {
  console.log('==============================');
  console.log('[GOOGLE CODE EXCHANGE] Google 인증 코드 교환 시작');
  console.log(`  🔑 인증 코드: ${code.substring(0, 20)}...`);
  console.log('==============================');

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = 'http://localhost:3000/auth/google/callback';

    // Google 토큰 엔드포인트로 요청
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.log('❌ [GOOGLE CODE EXCHANGE] 토큰 교환 실패');
      console.log(`  📝 오류: ${JSON.stringify(tokenData, null, 2)}`);
      return {
        success: false,
        error: 'Google 토큰 교환에 실패했습니다.'
      };
    }

    console.log('✅ [GOOGLE CODE EXCHANGE] 토큰 교환 성공');
    console.log(`  🔑 Access Token: ${tokenData.access_token ? '발급됨' : '발급안됨'}`);
    console.log(`  🆔 ID Token: ${tokenData.id_token ? '발급됨' : '발급안됨'}`);

    // ID Token 검증
    if (tokenData.id_token) {
      const googleUserInfo = await verifyGoogleIdToken(tokenData.id_token);

      if (googleUserInfo) {
        // 사용자 로그인 처리
        const loginData = {
          googleId: googleUserInfo.sub,
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          picture: googleUserInfo.picture,
          accessToken: tokenData.access_token
        };

        const result = await loginGoogleWithVerifiedInfo(loginData);

        // 회원가입이 필요한 경우
        if (result.needsSignup) {
          return {
            success: false,
            needsSignup: true,
            googleUserInfo: result.googleUserInfo
          };
        }

        // 로그인 성공한 경우
        return {
          success: true,
          user: {
            userId: result.userId,
            email: result.email,
            name: result.name,
            googleId: result.googleId,
            picture: result.picture,
            emailVerified: result.emailVerified
          },
          tokens: result.tokens
        };
      }
    }

    return {
      success: false,
      error: 'Google 사용자 정보를 가져올 수 없습니다.'
    };

  } catch (error) {
    console.log('❌ [GOOGLE CODE EXCHANGE] 토큰 교환 중 오류');
    console.log(`  📝 오류 메시지: ${error.message}`);
    return {
      success: false,
      error: 'Google 토큰 교환 중 오류가 발생했습니다.'
    };
  }
}

// 구글 계정 연결 함수
async function linkGoogleAccount(userId, googleData) {
  console.log('==============================');
  console.log('[LINK GOOGLE ACCOUNT] 구글 계정 연결 시작');
  console.log(`  👤 사용자 ID: ${userId}`);
  console.log(`  🆔 Google ID: ${googleData.googleId}`);
  console.log(`  📧 Google Email: ${googleData.googleEmail}`);
  console.log(`  👤 Google Name: ${googleData.googleName}`);
  console.log('==============================');

  try {
    // 1. 기존 사용자 확인
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('❌ [LINK GOOGLE ACCOUNT] 사용자를 찾을 수 없음');
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      };
    }

    console.log('✅ [LINK GOOGLE ACCOUNT] 사용자 확인 완료');
    console.log(`  👤 사용자 ID: ${user.id}`);
    console.log(`  📧 이메일: ${user.email}`);

    // 2. 이미 다른 계정에 연결된 구글 ID인지 확인
    const existingGoogleUser = await User.findOne({
      where: { googleId: googleData.googleId }
    });

    if (existingGoogleUser && existingGoogleUser.id !== userId) {
      console.log('❌ [LINK GOOGLE ACCOUNT] 이미 다른 계정에 연결된 구글 ID');
      console.log(`  👤 기존 사용자 ID: ${existingGoogleUser.id}`);
      console.log(`  📧 기존 사용자 이메일: ${existingGoogleUser.email}`);
      return {
        success: false,
        error: '이미 다른 계정에 연결된 Google 계정입니다.'
      };
    }

    console.log('✅ [LINK GOOGLE ACCOUNT] 구글 ID 중복 확인 완료');

    // 3. 사용자 정보 업데이트 (구글 계정 연결)
    const updateData = {
      googleId: googleData.googleId,
      emailVerified: true // 구글 계정은 이메일 인증 완료로 간주
    };

    console.log('📦 [LINK GOOGLE ACCOUNT] 업데이트 데이터:', JSON.stringify(updateData, null, 2));

    await user.update(updateData);

    console.log('✅ [LINK GOOGLE ACCOUNT] 구글 계정 연결 완료');
    console.log(`  🆔 Google ID: ${user.googleId}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  👤 이름: ${user.name}`);
    console.log(`  📧 이메일 인증: ${user.emailVerified ? '완료' : '미완료'}`);

    return {
      success: true,
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        googleId: user.googleId,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    };

  } catch (error) {
    console.log('❌ [LINK GOOGLE ACCOUNT] 구글 계정 연결 실패');
    console.log(`  📝 오류 타입: ${error.constructor.name}`);
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    return {
      success: false,
      error: '구글 계정 연결 중 오류가 발생했습니다.'
    };
  }
}

// 아이디 찾기
async function findId(email) {
  console.log('==============================');
  console.log('[FIND ID] 아이디 찾기 서비스 시작');
  console.log(`  📧 이메일: ${email}`);
  console.log('==============================');

  try {
    // 이메일로 사용자 조회
    const user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      console.log('❌ [FIND ID] 해당 이메일로 가입된 사용자가 없음');
      return { success: false, error: '해당 이메일로 가입된 사용자가 없습니다.' };
    }

    console.log('✅ [FIND ID] 사용자 조회 성공');
    console.log(`  👤 사용자 ID: ${user.userId}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  👤 이름: ${user.name}`);

    // 이메일 발송
    const emailResult = await emailService.sendFindIdEmail(email, user.userId, user.name);

    if (emailResult.success) {
      console.log('✅ [FIND ID] 아이디 찾기 이메일 발송 성공');
      return { success: true };
    } else {
      console.log('❌ [FIND ID] 아이디 찾기 이메일 발송 실패');
      return { success: false, error: '이메일 발송에 실패했습니다.' };
    }

  } catch (error) {
    console.log('❌ [FIND ID] 아이디 찾기 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    return { success: false, error: '아이디 찾기 중 오류가 발생했습니다.' };
  }
}

// 비밀번호 찾기
async function findPassword(email, userId) {
  console.log('==============================');
  console.log('[FIND PASSWORD] 비밀번호 찾기 서비스 시작');
  console.log(`  📧 이메일: ${email}`);
  console.log(`  👤 아이디: ${userId}`);
  console.log('==============================');

  try {
    // 이메일과 아이디로 사용자 조회
    const user = await User.findOne({
      where: {
        email: email,
        userId: userId
      }
    });

    if (!user) {
      console.log('❌ [FIND PASSWORD] 해당 정보로 가입된 사용자가 없음');
      return { success: false, error: '이메일과 아이디가 일치하는 사용자가 없습니다.' };
    }

    console.log('✅ [FIND PASSWORD] 사용자 조회 성공');
    console.log(`  👤 사용자 ID: ${user.userId}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  👤 이름: ${user.name}`);

    // 임시 비밀번호 생성
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedTempPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // 비밀번호 업데이트
    await user.update({
      password: hashedTempPassword
    });

    console.log('✅ [FIND PASSWORD] 임시 비밀번호 생성 및 업데이트 완료');

    // 이메일 발송
    const emailResult = await emailService.sendFindPasswordEmail(email, userId, tempPassword, user.name);

    if (emailResult.success) {
      console.log('✅ [FIND PASSWORD] 비밀번호 찾기 이메일 발송 성공');
      return { success: true };
    } else {
      console.log('❌ [FIND PASSWORD] 비밀번호 찾기 이메일 발송 실패');
      return { success: false, error: '이메일 발송에 실패했습니다.' };
    }

  } catch (error) {
    console.log('❌ [FIND PASSWORD] 비밀번호 찾기 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');

    return { success: false, error: '비밀번호 찾기 중 오류가 발생했습니다.' };
  }
}

// 이메일로 사용자 찾기
async function findUserByEmail(email) {
  console.log('==============================');
  console.log('[FIND USER BY EMAIL] 이메일로 사용자 찾기');
  console.log(`  📧 이메일: ${email}`);
  console.log('==============================');

  try {
    const user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      console.log('❌ [FIND USER BY EMAIL] 사용자를 찾을 수 없음');
      return null;
    }

    console.log('✅ [FIND USER BY EMAIL] 사용자 찾기 성공');
    console.log(`  👤 사용자 ID: ${user.id}`);
    console.log(`  📧 이메일: ${user.email}`);
    console.log(`  👤 이름: ${user.name}`);

    return user;
  } catch (error) {
    console.log('❌ [FIND USER BY EMAIL] 사용자 찾기 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');
    return null;
  }
}

// 비밀번호 재설정 인증번호 발송 (기존 PhoneVerification 테이블 활용)
async function sendPasswordResetCode(email) {
  console.log('==============================');
  console.log('[SEND PASSWORD RESET CODE] 비밀번호 재설정 인증번호 발송');
  console.log(`  📧 이메일: ${email}`);
  console.log('==============================');

  try {
    // 사용자 확인
    const user = await findUserByEmail(email);
    if (!user) {
      return { success: false, error: '해당 이메일로 가입된 사용자가 없습니다.' };
    }

    // 인증번호 생성 (6자리)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 유효

    // 기존 인증번호 삭제 (이메일을 phone 필드에 임시 저장)
    await PhoneVerification.destroy({
      where: { phone: email }
    });

    // 새 인증번호 저장 (이메일을 phone 필드에 임시 저장)
    await PhoneVerification.create({
      phone: email, // 이메일을 phone 필드에 임시 저장
      code: code,
      expiresAt: expiresAt,
      isVerified: false,
      verifiedAt: null
    });

    console.log('✅ [SEND PASSWORD RESET CODE] 인증번호 저장 완료');
    console.log(`  🔢 인증번호: ${code}`);
    console.log(`  ⏰ 만료시각: ${expiresAt.toISOString()}`);

    // 이메일 발송
    const emailResult = await emailService.sendPasswordResetCodeEmail(email, code, user.name);

    if (emailResult.success) {
      console.log('✅ [SEND PASSWORD RESET CODE] 인증번호 이메일 발송 성공');
      return {
        success: true,
        expiresAt: expiresAt
      };
    } else {
      console.log('❌ [SEND PASSWORD RESET CODE] 인증번호 이메일 발송 실패');
      return { success: false, error: '이메일 발송에 실패했습니다.' };
    }

  } catch (error) {
    console.log('❌ [SEND PASSWORD RESET CODE] 인증번호 발송 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');
    return { success: false, error: '인증번호 발송 중 오류가 발생했습니다.' };
  }
}

// 인증번호 확인 및 비밀번호 재설정
async function resetPasswordWithCode(email, code, newPassword) {
  console.log('==============================');
  console.log('[RESET PASSWORD WITH CODE] 인증번호 확인 및 비밀번호 재설정');
  console.log(`  📧 이메일: ${email}`);
  console.log(`  🔢 인증번호: ${code}`);
  console.log(`  🔑 새 비밀번호 길이: ${newPassword.length}자`);
  console.log('==============================');

  try {
    // 인증번호 조회
    const resetCode = await PhoneVerification.findOne({
      where: {
        phone: email, // 이메일을 phone 필드에 임시 저장했으므로
        code: code,
        isVerified: false,
        expiresAt: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!resetCode) {
      console.log('❌ [RESET PASSWORD WITH CODE] 유효한 인증번호를 찾을 수 없음');
      return { success: false, error: '인증번호가 올바르지 않거나 만료되었습니다.' };
    }

    console.log('✅ [RESET PASSWORD WITH CODE] 인증번호 확인 성공');

    // 사용자 조회
    const user = await findUserByEmail(email);
    if (!user) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' };
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 비밀번호 업데이트 (User 테이블의 password만 변경)
    await user.update({
      password: hashedPassword
    });

    // 인증번호 사용 처리
    await resetCode.update({ isVerified: true, verifiedAt: new Date() });

    console.log('✅ [RESET PASSWORD WITH CODE] 비밀번호 재설정 완료');
    console.log(`  👤 사용자 ID: ${user.userId}`);
    console.log(`  📧 이메일: ${user.email}`);

    // 완료 이메일 발송
    const emailResult = await emailService.sendPasswordResetCompleteEmail(email, user.name);

    if (emailResult.success) {
      console.log('✅ [RESET PASSWORD WITH CODE] 완료 이메일 발송 성공');
    } else {
      console.log('⚠️ [RESET PASSWORD WITH CODE] 완료 이메일 발송 실패');
    }

    return { success: true };

  } catch (error) {
    console.log('❌ [RESET PASSWORD WITH CODE] 비밀번호 재설정 실패');
    console.log(`  📝 오류 메시지: ${error.message}`);
    console.log('==============================');
    return { success: false, error: '비밀번호 재설정 중 오류가 발생했습니다.' };
  }
}

async function validatePassword(userId, password) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 비밀번호 검증
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid;
  } catch (error) {
    console.error('🚨 비밀번호 검증 에러:', error.message);
    return false;
  }
}

function parseAuthHeader(headerValue) {
  if (!headerValue) return null;
  const parts = headerValue.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
}

async function refreshToken(inputRefreshTokenOrHeader) {
  const tokenFromHeader = parseAuthHeader(inputRefreshTokenOrHeader);
  const provided = tokenFromHeader || inputRefreshTokenOrHeader;
  if (!provided) {
    throw new Error('리프레시 토큰이 필요합니다.');
  }

  let decoded;
  try {
    decoded = jwt.verify(provided, JWT_SECRET);
  } catch (e) {
    throw new Error('유효하지 않은 리프레시 토큰입니다.');
  }

  const tokenUserId = decoded.userId;

  // 저장된 리프레시 토큰 확인
  const existing = await RefreshToken.findOne({ where: { token: provided, userId: tokenUserId } });
  if (!existing) {
    throw new Error('리프레시 토큰이 존재하지 않거나 만료되었습니다.');
  }

  // 다중 세션 허용: 기존 토큰을 유지하고 새 토큰만 발급
  const newTokens = generateTokens(tokenUserId);

  // 새 리프레시 토큰 저장 (기존 토큰은 유지)
  await RefreshToken.create({
    token: newTokens.refreshToken,
    userId: tokenUserId,
    expiresAt: getRefreshTokenExpiresAt()
  });

  console.log(`🔄 [REFRESH TOKEN] 토큰 갱신 성공 - 사용자 ID: ${tokenUserId}`);
  console.log(`  📱 다중 세션 허용: 기존 토큰 유지, 새 토큰 발급`);

  return newTokens;
}

module.exports = {
  signup,
  signupKakao, signupGoogle,
  login, loginKakao, loginGoogle, loginGoogleWithVerifiedInfo,
  verifyGoogleIdToken, handleGoogleOAuth, exchangeGoogleCode,
  generateTokens, issueToken,
  getAccount, updateAccount, deleteAccount,
  sendEmailVerification, confirmEmailCode, checkEmailDuplication,
  sendPasswordReset, verifyPhoneNumber, logout,
  recoverIdByPhone, recoverPasswordByEmail,
  registerSocialUser,
  findOrCreateUser,
  sendWelcomeEmail,
  sendPhoneVerification,
  confirmPhoneCode,
  checkPhoneVerification,
  changePassword,
  updateProfile,
  linkGoogleAccount,
  findId,
  findPassword,
  findUserByEmail,
  sendPasswordResetCode,
  resetPasswordWithCode,
  validatePassword,
  refreshToken
};

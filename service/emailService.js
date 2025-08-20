const nodemailer = require('nodemailer');

// 이메일 설정 (실제 환경에서는 환경변수 사용)
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,          // 465 TLS도 가능
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password', // ← 앱 비밀번호
  },
};

// 이메일 발송 함수
async function sendEmail(to, subject, html) {
  try {
    console.log('📧 이메일 발송 시도:', to);
    console.log('📧 SMTP 설정:', {
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.auth.user,
      pass: emailConfig.auth.pass ? '***' : 'undefined'
    });

    // 개발 환경에서는 콘솔에만 출력 (임시)
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      console.log('📧 이메일 발송 (개발 환경)');
      console.log('받는 사람:', to);
      console.log('제목:', subject);
      console.log('내용:', html);
      return true;
    }

    // 실제 이메일 발송
    const transporter = nodemailer.createTransport(emailConfig);

    const mailOptions = {
      from: emailConfig.auth.user,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 이메일 발송 완료:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error.message);
    console.error('❌ 상세 에러:', error);
    return false;
  }
}

// 인증 코드 이메일 템플릿
function createVerificationEmail(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">이메일 인증</h2>
      <p>안녕하세요! 회원가입을 위한 이메일 인증 코드입니다.</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007AFF; font-size: 32px; margin: 0;">${code}</h1>
      </div>
      <p>위의 6자리 코드를 입력하여 이메일 인증을 완료해 주세요.</p>
      <p>이 코드는 10분 후에 만료됩니다.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        본 메일은 자동으로 발송되었습니다. 회신하지 마세요.
      </p>
    </div>
  `;
}

// 비밀번호 재설정 이메일 템플릿
function createPasswordResetEmail(token) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">비밀번호 재설정</h2>
      <p>비밀번호 재설정을 요청하셨습니다.</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007AFF; font-size: 24px; margin: 0;">${token}</h1>
      </div>
      <p>위의 토큰을 사용하여 비밀번호를 재설정할 수 있습니다.</p>
      <p>이 토큰은 1시간 후에 만료됩니다.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        본 메일은 자동으로 발송되었습니다. 회신하지 마세요.
      </p>
    </div>
  `;
}

// 비밀번호 재설정 인증번호 이메일 발송
async function sendPasswordResetCodeEmail(email, code, userName) {
  const subject = '[K디지털] 비밀번호 재설정 인증번호';
  const html = createPasswordResetCodeEmail(code, userName);

  const result = await sendEmail(email, subject, html);
  return { success: result };
}

// 비밀번호 재설정 완료 이메일 발송
async function sendPasswordResetCompleteEmail(email, userName) {
  const subject = '[K디지털] 비밀번호 재설정 완료';
  const html = createPasswordResetCompleteEmail(userName);

  const result = await sendEmail(email, subject, html);
  return { success: result };
}

// 아이디 찾기 이메일 발송
async function sendFindIdEmail(email, userId, userName) {
  const subject = '[K디지털] 아이디 찾기 결과';
  const html = createFindIdEmail(email, userName);

  const result = await sendEmail(email, subject, html);
  return { success: result };
}

// 비밀번호 재설정 인증번호 이메일 템플릿
function createPasswordResetCodeEmail(code, userName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">비밀번호 재설정 인증번호</h2>
      <p>안녕하세요, ${userName}님!</p>
      <p>비밀번호 재설정을 위한 인증번호를 발송해드립니다.</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007AFF; font-size: 32px; margin: 0;">${code}</h1>
      </div>
      <p>위의 6자리 인증번호를 입력하여 비밀번호 재설정을 진행해 주세요.</p>
      <p>이 인증번호는 10분 후에 만료됩니다.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        본 메일은 자동으로 발송되었습니다. 회신하지 마세요.
      </p>
    </div>
  `;
}

// 비밀번호 재설정 완료 이메일 템플릿
function createPasswordResetCompleteEmail(userName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">비밀번호 재설정 완료</h2>
      <p>안녕하세요, ${userName}님!</p>
      <p>비밀번호가 성공적으로 재설정되었습니다.</p>
      <div style="background-color: #e8f5e8; padding: 20px; text-align: center; margin: 20px 0;">
        <h3 style="color: #28a745; margin: 0;">✅ 비밀번호 재설정 완료</h3>
      </div>
      <p>새로운 비밀번호로 로그인하실 수 있습니다.</p>
      <p>보안을 위해 정기적으로 비밀번호를 변경하시는 것을 권장합니다.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        본 메일은 자동으로 발송되었습니다. 회신하지 마세요.
      </p>
    </div>
  `;
}

// 아이디 찾기 이메일 템플릿
function createFindIdEmail(email, userName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">아이디 찾기 결과</h2>
      <p>안녕하세요, ${userName}님!</p>
      <p>요청하신 아이디 찾기 결과를 알려드립니다.</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h3 style="color: #007AFF; margin: 0;">아이디 정보</h3>
        <p style="font-size: 18px; margin: 10px 0;">${email}</p>
      </div>
      <p>위의 이메일 주소가 귀하의 아이디입니다.</p>
      <p>로그인 시 이 이메일 주소를 사용하시면 됩니다.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        본 메일은 자동으로 발송되었습니다. 회신하지 마세요.
      </p>
    </div>
  `;
}

module.exports = {
  sendEmail,
  createVerificationEmail,
  createPasswordResetEmail,
  sendPasswordResetCodeEmail,
  sendPasswordResetCompleteEmail,
  sendFindIdEmail
}; 
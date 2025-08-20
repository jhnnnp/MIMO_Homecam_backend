# 데이터베이스 업그레이드 가이드

## 🚀 개선된 회원가입 시스템

### 📋 주요 변경사항

#### 1. User 테이블 개선
- **birth**: 생년월일 저장 (DATE 타입, 선택사항)
- **phoneVerified**: 휴대폰 인증 완료 상태 (BOOLEAN, 기본값: false)

#### 2. TermsAgreement 테이블 신규 생성
- **userId**: 사용자 ID (User 테이블 참조)
- **termsOfService**: 이용약관 동의 여부
- **privacyPolicy**: 개인정보 수집·이용 동의 여부
- **microphonePermission**: 마이크 접근 권한 동의 여부
- **locationPermission**: 위치 접근 권한 동의 여부
- **marketingConsent**: 마케팅 정보 수신 동의 여부 (선택)
- **agreedAt**: 약관 동의 일시

#### 3. PhoneVerification 테이블 개선
- **userId**: 사용자 ID (회원가입 전에는 null)
- **isVerified**: 인증 완료 여부 (BOOLEAN, 기본값: false)
- **verifiedAt**: 인증 완료 일시 (DATE)

### 🔗 테이블 관계

```
User (1) ←→ (1) TermsAgreement
User (1) ←→ (N) PhoneVerification
User (1) ←→ (N) Camera
User (1) ←→ (N) Recording
User (1) ←→ (N) Settings
User (1) ←→ (N) Notification
```

### 🛠️ 설치 및 실행

#### 1. 마이그레이션 실행
```bash
cd backend
node run-migrations.js
```

#### 2. 서버 시작
```bash
npm start
```

### 📡 API 엔드포인트

#### 회원가입 관련
- `POST /auth/signup` - 회원가입 (새로운 구조)
- `POST /auth/phone/send` - 휴대폰 인증번호 발송
- `POST /auth/phone/verify` - 휴대폰 인증번호 검증
- `GET /auth/phone/check/:phone` - 휴대폰 인증 상태 확인

#### 회원가입 요청 예시
```json
{
  "email": "user@example.com",
  "password": "password123!",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "birth": "1990-01-01",
  "agreeTerms": true,
  "agreePrivacy": true,
  "agreeMicrophone": true,
  "agreeLocation": true,
  "agreeMarketing": false
}
```

### 🔒 보안 개선사항

1. **트랜잭션 처리**: 회원가입 시 User와 TermsAgreement 테이블 동시 생성
2. **인증 상태 관리**: 휴대폰 인증 완료 여부 추적
3. **약관 동의 기록**: 법적 요구사항 충족을 위한 약관 동의 내역 저장
4. **비밀번호 해싱**: bcrypt를 사용한 안전한 비밀번호 저장

### 📊 데이터 흐름

1. **Step 1**: 약관 동의 → TermsAgreement 테이블에 저장
2. **Step 2**: 본인 인증 → PhoneVerification 테이블에 인증 상태 저장
3. **Step 3**: 계정 생성 → User 테이블에 사용자 정보 저장

### 🎯 프론트엔드 연동

프론트엔드의 `SignupScreen.tsx`와 완벽하게 호환됩니다:
- 모든 폼 필드가 백엔드 API와 매핑됨
- 실시간 유효성 검사 지원
- 휴대폰 인증 상태 추적
- 약관 동의 내역 저장

### 🔧 개발 환경

- **Node.js**: 16.x 이상
- **MySQL**: 8.0 이상
- **Sequelize**: 6.x
- **bcrypt**: 비밀번호 해싱
- **jsonwebtoken**: JWT 토큰 관리

### 📝 주의사항

1. 기존 데이터가 있는 경우 마이그레이션 전 백업 필수
2. 환경변수 설정 확인 (JWT_SECRET, DB 연결 정보 등)
3. SMS 서비스 연동 시 실제 SMS 발송 API로 교체 필요

### 🚨 문제 해결

#### 마이그레이션 실패 시
```bash
# 데이터베이스 연결 확인
node -e "require('./models').sequelize.authenticate().then(() => console.log('OK')).catch(console.error)"

# 수동으로 테이블 생성
node -e "require('./models').sequelize.sync({force: true})"
```

#### API 테스트
```bash
# 회원가입 테스트
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123!","name":"테스트","phone":"010-1234-5678","agreeTerms":true,"agreePrivacy":true,"agreeMicrophone":true,"agreeLocation":true}'
``` 
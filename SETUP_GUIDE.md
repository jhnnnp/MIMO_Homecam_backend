# 🔧 MIMO Camera Backend 설정 가이드

## 🚨 **중요: 보안 업데이트 필요**

현재 `.env` 파일에 민감한 정보가 노출되어 있습니다. 다음 단계를 따라 새로운 보안 설정을 적용하세요.

## 📋 **1단계: 새로운 .env 파일 생성**

### 1.1 기존 .env 파일 백업
```bash
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

### 1.2 새로운 .env 파일 생성
```bash
cp env.example .env
```

### 1.3 보안 값 설정
다음 값들을 새로 생성된 .env 파일에 설정하세요:

```bash
# ========================================
# SERVER CONFIGURATION
# ========================================
NODE_ENV=development
PORT=4001

# ========================================
# DATABASE CONFIGURATION
# ========================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=mimo_user
DB_PASSWORD=mimo_secure_password_2024
DB_NAME=mimo_camera_db

# ========================================
# JWT SECURITY (새로 생성된 값)
# ========================================
JWT_ACCESS_SECRET=5ef8ffd2398fedf381efb7bcdd949c43be32759b79c4da7eee482516bc0a25e5aa664a69536fb97657cbc391001d827a6c793ff549c939b83fd187cb29c08c21
JWT_REFRESH_SECRET=859f66e02e377c17115e0f5ed7ce1dd25a1b71b048ebc143064ac180e0eda85c31765cf7a1a0ad0dceabe568e3a0dc331e0a45d4f4476569ce096271a356410f
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ========================================
# AWS S3 STORAGE (새로운 버킷 필요)
# ========================================
AWS_ACCESS_KEY_ID=your_new_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_new_aws_secret_access_key
AWS_REGION=ap-northeast-2
AWS_BUCKET_NAME=your-new-mimo-media-bucket
AWS_FOLDER_PREFIX=videos/

# ========================================
# GOOGLE OAUTH 2.0 (새로운 프로젝트 필요)
# ========================================
GOOGLE_CLIENT_ID=your_new_google_client_id
GOOGLE_CLIENT_SECRET=your_new_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4001/auth/google/callback

# ========================================
# EMAIL CONFIGURATION
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_new_app_password

# ========================================
# SMS CONFIGURATION (선택사항)
# ========================================
ENABLE_SMS=false
TWILIO_ACCOUNT_SID=your_new_twilio_account_sid
TWILIO_AUTH_TOKEN=your_new_twilio_auth_token
TWILIO_PHONE_NUMBER=your_new_twilio_phone_number
```

## 🗄️ **2단계: 데이터베이스 재설정**

### 2.1 데이터베이스 설정 스크립트 실행
```bash
./setup-database.sh
```

### 2.2 수동 설정 (스크립트 실패 시)
```bash
# MySQL에 root로 접속
mysql -u root -p

# SQL 스크립트 실행
source setup-database.sql
```

## 🔐 **3단계: Google OAuth 재설정**

### 3.1 Google Cloud Console에서 새 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성: `mimo-camera-2024`
3. OAuth 2.0 클라이언트 ID 생성

### 3.2 OAuth 동의 화면 설정
- 앱 이름: `MIMO Camera`
- 사용자 지원 이메일: `your_email@gmail.com`
- 개발자 연락처 정보: `your_email@gmail.com`

### 3.3 OAuth 2.0 클라이언트 ID 생성
- 애플리케이션 유형: `웹 애플리케이션`
- 승인된 리디렉션 URI:
  - `http://localhost:4001/auth/google/callback`
  - `http://localhost:3000/auth/google/callback`

## ☁️ **4단계: AWS S3 재설정**

### 4.1 새 S3 버킷 생성
1. [AWS S3 Console](https://s3.console.aws.amazon.com/) 접속
2. 새 버킷 생성: `mimo-camera-media-2024`
3. 리전: `ap-northeast-2` (서울)

### 4.2 IAM 사용자 생성
1. [AWS IAM Console](https://console.aws.amazon.com/iam/) 접속
2. 새 사용자 생성: `mimo-camera-s3-user`
3. 권한: `AmazonS3FullAccess` (또는 커스텀 정책)

### 4.3 액세스 키 생성
1. 생성된 사용자에서 액세스 키 생성
2. 새 액세스 키와 시크릿 키를 .env 파일에 설정

## 📧 **5단계: 이메일 설정**

### 5.1 Gmail 앱 비밀번호 생성
1. [Google 계정 설정](https://myaccount.google.com/) 접속
2. 보안 → 2단계 인증 활성화
3. 앱 비밀번호 생성: `MIMO Camera Backend`

### 5.2 .env 파일에 설정
```bash
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
```

## 🧪 **6단계: 설정 테스트**

### 6.1 데이터베이스 연결 테스트
```bash
node -e "
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('mimo_camera_db', 'mimo_user', 'mimo_secure_password_2024', {
  host: 'localhost',
  dialect: 'mysql'
});

sequelize.authenticate()
  .then(() => console.log('✅ 데이터베이스 연결 성공'))
  .catch(err => console.error('❌ 데이터베이스 연결 실패:', err));
"
```

### 6.2 서버 시작 테스트
```bash
npm start
```

## 🔒 **7단계: 보안 확인**

### 7.1 .env 파일 권한 설정
```bash
chmod 600 .env
```

### 7.2 .gitignore 확인
```bash
echo ".env" >> .gitignore
echo ".env.backup.*" >> .gitignore
```

### 7.3 기존 민감한 파일 삭제
```bash
# 기존 .env 파일 삭제 (백업 후)
rm .env.backup.*
```

## 📝 **8단계: 마이그레이션 실행**

### 8.1 마이그레이션 실행
```bash
node run-migrations.js
```

### 8.2 데이터베이스 상태 확인
```bash
mysql -u mimo_user -p -e "USE mimo_camera_db; SHOW TABLES;"
```

## ✅ **완료 확인**

모든 설정이 완료되면 다음 명령어로 서버를 시작하세요:

```bash
npm start
```

서버가 정상적으로 시작되면 다음 URL에서 확인할 수 있습니다:
- 로컬: http://localhost:4001
- 네트워크: http://192.168.0.8:4001

## 🆘 **문제 해결**

### 데이터베이스 연결 실패
```bash
# MySQL 서비스 상태 확인
brew services list | grep mysql

# MySQL 재시작
brew services restart mysql
```

### 포트 충돌
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :4001

# 프로세스 종료
kill -9 [PID]
```

### 권한 문제
```bash
# 파일 권한 확인
ls -la .env

# 권한 수정
chmod 600 .env
``` 
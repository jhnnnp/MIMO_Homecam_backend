# MIMO Camera Backend API

[![Build Status](https://github.com/mimo-camera/backend/workflows/CI/badge.svg)](https://github.com/mimo-camera/backend/actions)
[![Coverage Status](https://codecov.io/gh/mimo-camera/backend/branch/main/graph/badge.svg)](https://codecov.io/gh/mimo-camera/backend)
[![Node.js](https://badges.frapsoft.com/nodejs/code/nodejs.svg?v=101)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎥 MIMO Camera System의 백엔드 API 서버**  
> Node.js + Express + MySQL + S3을 기반으로 한 완전한 홈 카메라 솔루션

## 📚 Table of Contents

- [개요](#개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [설치 및 설정](#설치-및-설정)
- [API 문서](#api-문서)
- [아키텍처](#아키텍처)
- [개발 가이드](#개발-가이드)
- [테스트](#테스트)
- [배포](#배포)
- [문제 해결](#문제-해결)
- [기여 가이드](#기여-가이드)

## 🎯 개요

MIMO Camera Backend는 **항상 대기 중인 홈캠**과 **뷰어 간의 실시간 연결**을 지원하는 REST API 서버입니다. QR/PIN 기반 간편 연결, 실시간 스트리밍, 클라우드 저장소를 제공합니다.

### 🏠 홈캠 시스템의 본질

MIMO는 전통적인 홈캠의 본질을 그대로 구현합니다:
- **홈캠**: 거치해놓고 계속 촬영하는 카메라 (항상 대기 상태)
- **뷰어**: 언제든 홈캠에 접속하여 실시간 화면을 시청
- **간편 연결**: QR 코드 스캔 또는 PIN 입력으로 즉시 연결

### 핵심 특징

- 🎥 **항상 대기**: 홈캠 앱 실행 시 자동으로 연결 대기 상태
- 📱 **간편 연결**: QR 스캔 또는 6자리 PIN 입력으로 즉시 연결
- 🔐 **보안 우선**: JWT 인증, 이메일 인증, 연결 코드 만료 관리
- 👥 **다중 사용자**: 이메일 기반 사용자 관리 및 권한 제어
- 📡 **실시간 통신**: WebSocket 기반 스트리밍 및 상태 동기화
- ☁️ **클라우드 네이티브**: S3 호환 저장소, 컨테이너화
- 📊 **모니터링**: 헬스체크, 구조화된 로깅
- 🏗️ **깔끔한 아키텍처**: Controller-Service 패턴으로 관심사 분리

## 🚀 주요 기능

### 🏠 홈캠-뷰어 연결 시스템
- **항상 대기**: 홈캠 앱 실행 시 자동으로 연결 대기 상태
- **QR/PIN 생성**: 홈캠에서 6자리 PIN과 QR 코드 동시 생성
- **즉시 연결**: 뷰어에서 QR 스캔 또는 PIN 입력으로 즉시 연결
- **연결 코드 관리**: 만료 시간 설정, 자동 갱신, 보안 검증
- **실시간 상태**: WebSocket 기반 연결 상태 실시간 동기화

### 🔐 인증 & 권한 관리
- 이메일/비밀번호 로그인
- Google OAuth 2.0 로그인
- JWT Access/Refresh Token 시스템
- 이메일 인증 시스템 (6자리 인증 코드)
- 세션 관리 및 디바이스별 권한 제어

### 📱 디바이스 관리
- 카메라 디바이스 등록 및 관리
- 실시간 상태 모니터링 (연결 대기/활성/비활성)
- 디바이스 설정 및 메타데이터 관리
- 하트비트 시스템으로 연결 상태 추적
- 다중 뷰어 동시 접속 지원

### 이벤트 & 미디어 처리
- 동영상 이벤트 자동 감지 및 저장
- S3 Presigned URL을 통한 안전한 업로드/다운로드
- 이벤트 필터링 및 검색 (날짜, 타입, 점수)
- 이벤트 고정/고정 해제 기능

### 알림 시스템
- 실시간 알림 생성 및 관리
- 읽음/읽지 않음 상태 관리
- 알림 타입별 분류 (motion, system, security, maintenance)
- 알림 통계 및 정리 기능

### 설정 관리
- 사용자별 설정 저장 및 관리
- 카메라별 개별 설정 지원
- 설정 백업/복원 기능
- 설정 유효성 검증

### 운영 도구
- 포괄적인 헬스체크
- 구조화된 로깅
- API 문서 (준비 중)
- 데이터베이스 마이그레이션

## 🛠 기술 스택

### 백엔드 코어
- **Runtime**: Node.js 18+ 
- **Language**: JavaScript (ES6+)
- **Framework**: Express.js 4.18+
- **API**: REST API

### 데이터베이스 & 저장소
- **Database**: MySQL 8.0 (Sequelize ORM)
- **Storage**: AWS S3 (또는 호환 저장소)

### 보안 & 인증
- **Authentication**: JWT (jsonwebtoken)
- **OAuth**: Google OAuth 2.0
- **Email**: Nodemailer (이메일 인증)
- **Security**: bcrypt (비밀번호 해싱)

### 개발 도구
- **Testing**: Jest + Supertest (준비 중)
- **Documentation**: JSDoc 주석
- **Containerization**: Docker (준비 중)

## ⚡ 빠른 시작

### 개발 환경 실행

```bash
# 저장소 클론
git clone https://github.com/jhnnnp/MIMO_Homecam_backend.git
cd MIMO_Homecam_backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 데이터베이스 연결 정보 입력

# 데이터베이스 마이그레이션
node run-migrations.js

# 개발 서버 시작
npm start
```

🎉 **완료!** API가 http://localhost:4001에서 실행됩니다.

## 🔧 설치 및 설정

### 시스템 요구사항

- **Node.js**: 18.0.0 이상
- **npm**: 8.0.0 이상
- **MySQL**: 8.0 이상

### 환경 변수 설정

필수 환경 변수들을 `.env` 파일에 설정:

```bash
# 서버 설정
NODE_ENV=development
PORT=4001

# 데이터베이스
DB_HOST=localhost
DB_PORT=3306
DB_USER=mimo_user
DB_PASSWORD=mimo_password
DB_NAME=mimo_camera

# JWT 시크릿 (프로덕션에서 변경 필수!)
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# AWS S3
S3_REGION=ap-northeast-2
S3_BUCKET=mimo-media
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Google OAuth (선택적)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 이메일 설정
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### 데이터베이스 설정

```bash
# MySQL 설치 및 데이터베이스 생성
mysql -u root -p
CREATE DATABASE mimo_camera;
CREATE USER 'mimo_user'@'%' IDENTIFIED BY 'mimo_password';
GRANT ALL PRIVILEGES ON mimo_camera.* TO 'mimo_user'@'%';
FLUSH PRIVILEGES;

# 마이그레이션 실행
node run-migrations.js
```

## 📖 API 문서

### 주요 엔드포인트

#### 인증 API
```http
POST /api/auth/login              # 이메일/비밀번호 로그인
POST /api/auth/register           # 회원가입
POST /api/auth/google             # Google OAuth 로그인
POST /api/auth/refresh            # 토큰 갱신
POST /api/auth/logout             # 로그아웃
```

#### 프로필 API
```http
GET  /api/profile                 # 프로필 조회
PUT  /api/profile                 # 프로필 업데이트
POST /api/profile/email-verification     # 이메일 인증 코드 발송
POST /api/profile/verify-email           # 이메일 인증 코드 확인
GET  /api/profile/email-verification-status  # 이메일 인증 상태 확인
```

#### 홈캠 연결 API
```http
GET  /api/cameras                 # 카메라 목록 조회
POST /api/cameras                 # 새 카메라 등록
GET  /api/cameras/:id             # 카메라 상세 조회
PUT  /api/cameras/:id             # 카메라 업데이트
DELETE /api/cameras/:id           # 카메라 삭제
POST /api/cameras/:id/heartbeat   # 하트비트 전송 (연결 상태 유지)
GET  /api/cameras/:id/stats       # 카메라 통계 조회

# 연결 코드 관리
POST /api/qr/generate             # QR/PIN 코드 생성 (홈캠용)
POST /api/qr/validate             # QR/PIN 코드 검증 (뷰어용)
GET  /api/qr/:code/info           # 연결 코드 정보 조회
POST /api/connection/establish    # 홈캠-뷰어 연결 설정
GET  /api/connection/active       # 활성 연결 목록 조회
```

#### 이벤트 API
```http
GET  /api/events                  # 이벤트 목록 조회 (필터링 지원)
POST /api/events                  # 새 이벤트 생성
GET  /api/events/:id              # 이벤트 상세 조회
PUT  /api/events/:id              # 이벤트 업데이트
DELETE /api/events/:id            # 이벤트 삭제
POST /api/events/:id/pin          # 이벤트 고정/고정 해제
GET  /api/events/stats            # 이벤트 통계 조회
```

#### 녹화 API
```http
GET  /api/recordings              # 녹화 파일 목록 조회
POST /api/recordings              # 새 녹화 파일 생성
GET  /api/recordings/:id          # 녹화 파일 상세 조회
PUT  /api/recordings/:id          # 녹화 파일 업데이트
DELETE /api/recordings/:id        # 녹화 파일 삭제
GET  /api/events/:id/recordings   # 이벤트별 녹화 파일 목록
GET  /api/recordings/stats        # 녹화 파일 통계 조회
```

#### 알림 API
```http
GET  /api/notifications           # 알림 목록 조회
POST /api/notifications           # 새 알림 생성
GET  /api/notifications/:id       # 알림 상세 조회
PUT  /api/notifications/:id/read  # 알림 읽음 처리
PUT  /api/notifications/read-all  # 모든 알림 읽음 처리
DELETE /api/notifications/:id     # 알림 삭제
GET  /api/notifications/unread-count  # 읽지 않은 알림 수
GET  /api/notifications/stats     # 알림 통계 조회
```

#### 설정 API
```http
GET  /api/settings                # 설정 조회
PUT  /api/settings                # 설정 업데이트
GET  /api/settings/:key           # 특정 설정 값 조회
PUT  /api/settings/:key           # 특정 설정 값 업데이트
POST /api/settings/reset          # 설정 초기화
GET  /api/cameras/:id/settings    # 카메라별 설정 조회
PUT  /api/cameras/:id/settings    # 카메라별 설정 업데이트
POST /api/settings/export         # 설정 내보내기
POST /api/settings/import         # 설정 가져오기
```

#### 미디어 API
```http
POST /api/media/presign           # 업로드용 Presigned URL 생성
POST /api/media/complete          # 업로드 완료 통지
GET  /api/clips/:id/presign-get   # 다운로드용 Presigned URL
```

### API 응답 형식

모든 API 응답은 일관된 형식을 사용합니다:

```json
// 성공 응답
{
  "ok": true,
  "data": {
    // 실제 데이터
  },
  "message": "성공 메시지 (선택적)"
}

// 에러 응답
{
  "ok": false,
  "error": {
    "code": "E_NOT_FOUND",
    "message": "에러 메시지"
  }
}
```

## 🏗 아키텍처

### 홈캠-뷰어 시스템 아키텍처

```
┌─────────────────┐                    ┌─────────────────┐
│   홈캠 앱       │                    │   뷰어 앱       │
│   (항상 대기)   │                    │   (연결 요청)   │
│                 │                    │                 │
│ 1. 앱 실행      │                    │ 1. QR 스캔      │
│ 2. 연결 대기    │ ◄──────────────────┤ 2. PIN 입력     │
│ 3. QR/PIN 생성  │                    │ 3. 즉시 연결    │
└─────────────────┘                    └─────────────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             │
         ┌───────────────────────────────────────────────┐
         │              MIMO Backend API                 │
         │  ┌─────────────┐  ┌─────────────┐            │
         │  │  REST API   │  │ WebSocket   │            │
         │  │   Server    │  │  Streaming  │            │
         │  │             │  │             │            │
         │  └─────────────┘  └─────────────┘            │
         │                                               │
         │  ┌─────────────┐  ┌─────────────┐            │
         │  │ QR/PIN 관리 │  │ 연결 상태   │            │
         │  │ 만료 처리   │  │ 실시간 동기 │            │
         │  └─────────────┘  └─────────────┘            │
         └───────────────────────────────────────────────┘
                                 │
    ┌─────────────┬──────────────┼──────────────┬─────────────┐
    │             │              │              │             │
┌───▼───┐    ┌───▼───┐    ┌─────▼─────┐    ┌───▼───┐    ┌───▼───┐
│ MySQL │    │ Email │    │    S3     │    │ Logs  │    │ JWT   │
│  DB   │    │Service│    │ Storage   │    │ Store │    │Tokens │
│       │    │       │    │           │    │       │    │       │
│연결코드│    │인증   │    │미디어저장 │    │시스템 │    │보안   │
│관리   │    │시스템 │    │           │    │로그   │    │토큰   │
└───────┘    └───────┘    └───────────┘    └───────┘    └───────┘
```

### 레이어 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     Routes Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │   Camera    │  │   Events    │         │
│  │   Routes    │  │   Routes    │  │   Routes    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │ Validation  │  │    Error    │         │
│  │ Middleware  │  │ Middleware  │  │  Handling   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │   Camera    │  │   Event     │         │
│  │   Service   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Sequelize  │  │   Email     │  │     S3      │         │
│  │   Models    │  │   Service   │  │   Storage   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 데이터베이스 ERD

```sql
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────▶│  sessions   │     │   cameras   │
│             │     │             │     │             │
│ • id        │     │ • id        │     │ • id        │
│ • email     │     │ • user_id   │     │ • user_id   │
│ • password  │     │ • token     │     │ • name      │
│ • name      │     │ • expires   │     │ • status    │
│ • nickname  │     └─────────────┘     └─────────────┘
│ • bio       │                                │
│ • birth     │                                ▼
│ • picture   │                       ┌─────────────┐
│ • emailVerified │                   │   events    │
└─────────────┘                       │             │
       │                              │ • id        │
       │                              │ • camera_id │
       │                              │ • type      │
       │                              │ • started_at│
       │                              │ • is_pinned │
       │                              └─────────────┘
       │                                       │
       │                              ┌─────────────┐
       │                              │ recordings  │
       │                              │             │
       │                              │ • id        │
       │                              │ • event_id  │
       │                              │ • index     │
       │                              │ • s3_key    │
       │                              │ • duration  │
       │                              │ • file_size │
       │                              └─────────────┘
       │
       │                              ┌─────────────┐
       │                              │notifications│
       │                              │             │
       │                              │ • id        │
       │                              │ • user_id   │
       │                              │ • type      │
       │                              │ • message   │
       │                              │ • is_read   │
       │                              └─────────────┘
       │
       │                              ┌─────────────┐
       │                              │  settings   │
       │                              │             │
       │                              │ • id        │
       │                              │ • user_id   │
       │                              │ • notification_enabled │
       │                              │ • email_notification   │
       │                              │ • motion_sensitivity   │
       │                              │ • recording_quality    │
       │                              └─────────────┘
       │
       └──────────────────────────────┐
                                      │
                              ┌─────────────┐
                              │EmailVerification│
                              │             │
                              │ • id        │
                              │ • user_id   │
                              │ • email     │
                              │ • verification_code │
                              │ • is_verified │
                              │ • expires_at │
                              └─────────────┘
```

## 👨‍💻 개발 가이드

### 개발 환경 설정

```bash
# 개발 의존성 설치
npm install

# VS Code 확장 프로그램 설치 (권장)
# - JavaScript
# - ESLint
# - Prettier
# - REST Client
```

### 코드 스타일 가이드

이 프로젝트는 JavaScript ES6+를 사용합니다:

```javascript
// ✅ Good: 명시적 함수 정의
async function getUserById(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

// ✅ Good: JSDoc 주석 사용
/**
 * 설명: 사용자 정보 조회
 * 입력: userId
 * 출력: 사용자 정보
 * 부작용: DB 조회
 * 예외: throw codes E_NOT_FOUND
 */
```

### 프로젝트 구조 규칙

- **Routes**: HTTP 엔드포인트만 정의, 비즈니스 로직 없음
- **Services**: 순수한 비즈니스 로직, Express와 분리
- **Models**: Sequelize 모델과 데이터베이스 스키마
- **Middleware**: 횡단 관심사 (인증, 검증, 로깅)
- **Controllers**: 요청/응답 처리, 서비스 호출

### 에러 처리 패턴

```javascript
// 서비스에서 에러 처리
async function getUser(id) {
  const user = await User.findByPk(id);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

// 컨트롤러에서 에러 처리
exports.getUser = async (req, res) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.json({ ok: true, data: { user } });
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({
        ok: false,
        error: { code: 'E_NOT_FOUND', message: 'User not found' }
      });
    } else {
      res.status(500).json({
        ok: false,
        error: { code: 'E_DATABASE_ERROR', message: 'Database error' }
      });
    }
  }
};
```

## 🧪 테스트

### 테스트 실행 (준비 중)

```bash
# 전체 테스트 실행
npm test

# 커버리지 포함 테스트
npm run test:coverage

# 테스트 파일 감시 모드
npm run test:watch
```

### 테스트 작성 가이드 (준비 중)

각 서비스 함수에 대해 다음 테스트를 작성할 예정입니다:

```javascript
// tests/services/auth.service.test.js
describe('AuthService', () => {
  describe('loginWithPassword', () => {
    it('should login with valid credentials', async () => {
      // Happy path 테스트
    });
    
    it('should fail with invalid email', async () => {
      // 검증 실패 테스트
    });
    
    it('should fail with wrong password', async () => {
      // 인증 실패 테스트
    });
  });
});
```

## 🚀 배포

### 프로덕션 환경 실행

```bash
# 프로덕션 환경 변수 설정
export NODE_ENV=production
export PORT=4001

# 프로덕션 서버 시작
npm start
```

### 환경별 설정

#### 개발 환경
```bash
export NODE_ENV=development
export DB_HOST=localhost
export DB_USER=mimo_user
export DB_PASSWORD=mimo_password
export DB_NAME=mimo_camera
```

#### 프로덕션 환경
```bash
export NODE_ENV=production
export DB_HOST=prod-db.internal
export JWT_ACCESS_SECRET=secure_production_secret
export JWT_REFRESH_SECRET=secure_refresh_secret
```

### 성능 최적화

#### 데이터베이스 최적화
- 자주 사용되는 쿼리에 인덱스 추가
- 연결 풀 크기 조정
- 느린 쿼리 로그 모니터링

#### 메모리 사용량 최적화
- 스트림을 사용한 대용량 파일 처리
- 정기적인 가비지 컬렉션 모니터링
- 메모리 누수 감지 및 수정

## 📊 모니터링

### 헬스체크

시스템 상태를 확인할 수 있는 엔드포인트들:

```bash
# 기본 헬스체크
curl http://localhost:4001/health

# 데이터베이스 연결 확인
curl http://localhost:4001/api/health/db
```

### 로그 형식

구조화된 로그를 사용합니다:

```json
{
  "level": "info",
  "time": "2023-12-01T10:00:00.000Z",
  "msg": "User logged in successfully",
  "userId": 456,
  "statusCode": 200
}
```

## ❗ 문제 해결

### 일반적인 문제들

#### 1. 데이터베이스 연결 실패
```bash
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**해결방법**: MySQL이 실행 중인지 확인하고 연결 정보를 검증하세요.

```bash
# MySQL 상태 확인
mysql -u mimo_user -p -h localhost mimo_camera

# 연결 정보 확인
echo $DB_HOST
echo $DB_USER
echo $DB_PASSWORD
```

#### 2. JWT 토큰 관련 에러
```bash
Error: Invalid token format
```
**해결방법**: JWT 시크릿이 올바르게 설정되었는지 확인하세요.

```bash
# 환경 변수 확인
echo $JWT_ACCESS_SECRET
echo $JWT_REFRESH_SECRET
```

#### 3. 이메일 인증 실패
```bash
Error: Email verification failed
```
**해결방법**: 이메일 설정을 확인하세요.

```bash
# 이메일 설정 확인
echo $EMAIL_HOST
echo $EMAIL_USER
echo $EMAIL_PASS
```

### 로그 분석

문제 진단을 위한 로그 명령어들:

```bash
# 에러 로그만 필터링
tail -f logs/app.log | grep "error"

# 특정 사용자 활동 추적
tail -f logs/app.log | grep "userId:123"

# 성능 문제 분석
tail -f logs/app.log | grep "duration"
```

## 🤝 기여 가이드

### 개발 프로세스

1. **이슈 생성**: 버그 리포트나 기능 요청을 위한 이슈를 먼저 생성
2. **브랜치 생성**: `feature/issue-number` 또는 `bugfix/issue-number` 형식
3. **개발**: 코딩 표준을 준수하며 개발
4. **테스트**: 새로운 코드에 대한 테스트 작성
5. **Pull Request**: 상세한 설명과 함께 PR 생성

### Pull Request 체크리스트

- [ ] 모든 테스트가 통과하는가?
- [ ] 린팅 에러가 없는가?
- [ ] 새로운 API는 문서화되었는가?
- [ ] JSDoc 주석이 추가되었는가?
- [ ] 브레이킹 체인지가 있다면 명시되었는가?

### 코딩 규칙

- JavaScript ES6+ 사용
- JSDoc 주석 필수
- Controller-Service 패턴 준수
- 의미 있는 커밋 메시지 작성

### 커밋 메시지 형식

```
feat(auth): add email verification system

- 이메일 인증 코드 발송 기능 추가
- 6자리 인증 코드 생성 및 검증
- 이메일 인증 상태 확인 API 추가

Closes #123
```

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.

## 📞 지원 및 연락처

### 개발자
- **이름**: 박진한 (JinHan Park)
- **이메일**: [jhnnn.park@gmail.com](mailto:jhnnn.park@gmail.com)
- **GitHub**: [@jhnnnp](https://github.com/jhnnnp)

### 프로젝트 링크
- **백엔드**: [https://github.com/jhnnnp/MIMO_Homecam_backend](https://github.com/jhnnnp/MIMO_Homecam_backend)
- **프론트엔드**: [https://github.com/jhnnnp/MIMO_Homecam_frontend](https://github.com/jhnnnp/MIMO_Homecam_frontend)
- **웹 클라이언트**: [https://github.com/jhnnnp/MIMO_Homecam_web](https://github.com/jhnnnp/MIMO_Homecam_web)

### 지원 채널
- **이슈 트래커**: [GitHub Issues](https://github.com/jhnnnp/MIMO_Homecam_backend/issues)
- **토론**: [GitHub Discussions](https://github.com/jhnnnp/MIMO_Homecam_backend/discussions)
- **이메일 지원**: [jhnnn.park@gmail.com](mailto:jhnnn.park@gmail.com)

---

**MIMO Camera Team**과 함께 만들어가는 오픈소스 홈 카메라 솔루션입니다. 🎥✨ 

# MIMO 데이터베이스 설계 분석 보고서

## 📊 전체 아키텍처 개요

MIMO 홈캠 프로젝트는 **MySQL 8.0** 기반의 관계형 데이터베이스를 사용하며, **Sequelize ORM**을 통해 Node.js와 연동되어 있습니다.

### 🗄️ 데이터베이스 구성
- **데이터베이스명**: `mimo_homecam_db`
- **문자셋**: `utf8mb4_unicode_ci`
- **ORM**: Sequelize v6.x
- **연결 풀**: 최대 5개 연결, 30초 타임아웃

## 🏗️ 테이블 구조 및 관계

### 1️⃣ 핵심 엔티티 테이블

#### **User** (사용자 관리)
```sql
- id (PK, AUTO_INCREMENT)
- email (UNIQUE, NOT NULL) - 로그인 식별자
- password_hash (VARCHAR 255) - bcrypt 해시
- name (VARCHAR 50, NOT NULL) - 실명
- nickname (VARCHAR 50) - 사용자 닉네임
- bio (TEXT) - 소개글
- phone (VARCHAR 20) - 휴대폰 번호
- birth (DATE) - 생년월일
- picture (TEXT) - 프로필 사진 URL
- email_verified (BOOLEAN, DEFAULT FALSE) - 이메일 인증 상태
- google_id (UNIQUE) - Google OAuth ID
- provider (VARCHAR 20, DEFAULT 'local') - 로그인 제공자
- created_at, updated_at (TIMESTAMP)
```

#### **Camera** (카메라 디바이스)
```sql
- id (PK, AUTO_INCREMENT)
- user_id (FK → User.id, NOT NULL)
- name (VARCHAR 100, NOT NULL) - 카메라 이름
- device_id (VARCHAR 255, UNIQUE) - 하드웨어 식별자
- location (VARCHAR 100) - 설치 위치
- status (ENUM: 'online', 'offline', 'error') - 연결 상태
- last_seen (TIMESTAMP) - 마지막 활동 시간
- last_heartbeat (TIMESTAMP) - 마지막 하트비트
- firmware (VARCHAR 50) - 펌웨어 버전
- settings (JSON) - 카메라 설정 정보
- created_at, updated_at (TIMESTAMP)
```

#### **Event** (이벤트 감지)
```sql
- id (PK, AUTO_INCREMENT)
- camera_id (FK → Camera.id, NOT NULL)
- type (ENUM: 'motion', 'sound', 'manual', 'scheduled')
- started_at (TIMESTAMP, NOT NULL) - 이벤트 시작 시간
- ended_at (TIMESTAMP) - 이벤트 종료 시간
- duration (INT, DEFAULT 0) - 지속 시간(초)
- score (DECIMAL 5,2) - 감지 신뢰도
- is_pinned (BOOLEAN, DEFAULT FALSE) - 중요 표시
- metadata (JSON) - 추가 메타데이터
- confidence (FLOAT) - 감지 정확도
- acknowledged (BOOLEAN, DEFAULT FALSE) - 확인 여부
- image_url (VARCHAR 255) - 썸네일 이미지 URL
```

#### **Recording** (녹화 파일)
```sql
- id (PK, AUTO_INCREMENT)
- event_id (FK → Event.id, NOT NULL)
- camera_id (FK → Camera.id, NOT NULL)
- user_id (FK → User.id, NOT NULL)
- index_num (INT, DEFAULT 0) - 분할 파일 순서
- s3_key (VARCHAR 500, NOT NULL) - S3 저장 키
- filename (VARCHAR 255) - 원본 파일명
- started_at, ended_at (TIMESTAMP) - 녹화 시간
- duration (INT, DEFAULT 0) - 재생 시간(초)
- file_size (BIGINT, DEFAULT 0) - 파일 크기(바이트)
- format (VARCHAR 10, DEFAULT 'mp4') - 파일 형식
```

### 2️⃣ 인증 및 보안 테이블

#### **EmailVerification** (이메일 인증)
```sql
- id (PK, AUTO_INCREMENT)
- user_id (FK → User.id, NOT NULL)
- email (VARCHAR 255, NOT NULL)
- verification_code (VARCHAR 6, NOT NULL) - 6자리 인증 코드
- is_verified (BOOLEAN, DEFAULT FALSE)
- expires_at (TIMESTAMP, NOT NULL) - 만료 시간
- created_at (TIMESTAMP)
```

#### **RefreshToken** (JWT 토큰 관리)
```sql
- id (PK, AUTO_INCREMENT)
- user_id (FK → User.id, NOT NULL)
- token (VARCHAR 500, NOT NULL) - 리프레시 토큰
- expires_at (TIMESTAMP, NOT NULL)
- created_at (TIMESTAMP)
```

#### **TermsAgreement** (약관 동의)
```sql
- id (PK, AUTO_INCREMENT)
- user_id (FK → User.id, NOT NULL)
- agree_terms (BOOLEAN, DEFAULT FALSE) - 이용약관
- agree_privacy (BOOLEAN, DEFAULT FALSE) - 개인정보처리방침
- agree_microphone (BOOLEAN, DEFAULT FALSE) - 마이크 권한
- agree_location (BOOLEAN, DEFAULT FALSE) - 위치 권한
- agree_marketing (BOOLEAN, DEFAULT FALSE) - 마케팅 수신
- created_at (TIMESTAMP)
```

### 3️⃣ 사용자 경험 테이블

#### **Notification** (알림 시스템)
```sql
- id (PK, AUTO_INCREMENT)
- user_id (FK → User.id, NOT NULL)
- type (ENUM: 'motion', 'system', 'security', 'maintenance')
- title (VARCHAR 200, NOT NULL) - 알림 제목
- message (TEXT, NOT NULL) - 알림 내용
- is_read (BOOLEAN, DEFAULT FALSE) - 읽음 상태
- priority (ENUM: 'low', 'medium', 'high', 'critical')
- metadata (JSON) - 추가 데이터
- created_at (TIMESTAMP)
```

#### **Settings** (사용자 설정)
```sql
- id (PK, AUTO_INCREMENT)
- user_id (FK → User.id, NOT NULL, UNIQUE)
- notification_enabled (BOOLEAN, DEFAULT TRUE)
- email_notification (BOOLEAN, DEFAULT TRUE)
- motion_sensitivity (INT, DEFAULT 50) - 1-100 범위
- recording_quality (ENUM: 'low', 'medium', 'high')
- storage_days (INT, DEFAULT 30) - 보관 기간
- app_lock_enabled (BOOLEAN, DEFAULT FALSE)
- app_lock_pin (VARCHAR 6) - 앱 잠금 PIN
- key (VARCHAR 50) - 설정 키
- value (TEXT) - 설정 값
- created_at, updated_at (TIMESTAMP)
```

## 🔗 테이블 관계도

```
<code_block_to_apply_changes_from>
```

## 📈 인덱스 최적화

### 성능 최적화 인덱스
```sql
-- 사용자 검색 최적화
CREATE INDEX idx_email ON User(email);
CREATE INDEX idx_google_id ON User(google_id);
CREATE INDEX idx_users_created_at ON User(created_at);

-- 카메라 관리 최적화
CREATE INDEX idx_user_id ON Camera(user_id);
CREATE INDEX idx_device_id ON Camera(device_id);
CREATE INDEX idx_status ON Camera(status);

-- 이벤트 검색 최적화
CREATE INDEX idx_camera_id ON Event(camera_id);
CREATE INDEX idx_started_at ON Event(started_at);
CREATE INDEX idx_type ON Event(type);
CREATE INDEX idx_is_pinned ON Event(is_pinned);
CREATE INDEX idx_events_camera_started ON Event(camera_id, started_at);

-- 알림 성능 최적화
CREATE INDEX idx_notifications_user_created ON Notification(user_id, created_at);
CREATE INDEX idx_is_read ON Notification(is_read);

-- 인증 관련 최적화
CREATE INDEX idx_verification_code ON EmailVerification(verification_code);
CREATE INDEX idx_expires_at ON EmailVerification(expires_at);
CREATE INDEX idx_token ON RefreshToken(token);
```

## 🔒 보안 설계

### 1. 데이터 보호
- **비밀번호**: bcrypt 해싱 (salt rounds 12)
- **JWT 토큰**: 리프레시 토큰 방식으로 보안 강화
- **이메일 인증**: 6자리 코드, 10분 만료
- **외래키 제약**: CASCADE 삭제로 데이터 무결성 보장

### 2. 개인정보 관리
- **약관 동의**: 법적 요구사항 준수
- **데이터 보관**: 설정 가능한 보관 기간
- **OAuth 연동**: Google 로그인 지원

## 🚀 마이그레이션 시스템

### 현재 마이그레이션 파일들
1. `20250127000000-create-user-table.js` - 사용자 테이블 생성
2. `20250127000003-create-terms-agreement-table.js` - 약관 동의 테이블
3. `20250127000005-add-google-fields-to-user.js` - Google OAuth 필드
4. `20250127000006-add-nickname-and-bio-to-user.js` - 프로필 필드
5. `20250127000007-add-phone-and-emailVerified-to-user.js` - 연락처 필드
6. `20250127000011-update-notification-table.js` - 알림 테이블 업데이트
7. `20250127000012-remove-sound-related-fields.js` - 사운드 필드 제거
8. `20250127000013-email-verification-system.js` - 이메일 인증 시스템
9. `20250904000000-add-deviceid-and-stream-columns-to-camera.sql` - 카메라 필드 추가

## ⚠️ 데이터베이스 설계 이슈 및 개선점

### 🔍 발견된 문제점

1. **스키마 불일치**: 
   - `database-schema.sql`과 Sequelize 모델 간 필드명 차이
   - 일부 테이블에서 컬럼 정의 불일치

2. **모델 정의 문제**:
   - `Event` 모델에 `started_at`, `ended_at` 필드 누락
   - `Recording` 모델에 `event_id` 관계 누락
   - `Settings` 모델이 key-value 구조와 고정 필드 구조 혼재

3. **인덱스 부족**:
   - 복합 인덱스 최적화 필요
   - JSON 필드 검색 인덱스 미적용

### 💡 권장 개선사항

1. **스키마 통일**: SQL 스키마와 Sequelize 모델 동기화
2. **관계 정의**: 누락된 외래키 관계 추가
3. **JSON 필드 최적화**: MySQL 8.0 JSON 함수 활용
4. **파티셔닝**: 대용량 이벤트/녹화 데이터 월별 파티셔닝
5. **아카이빙**: 오래된 데이터 자동 아카이빙 시스템

이러한 데이터베이스 설계는 홈캠 시스템의 실시간 모니터링, 이벤트 감지, 녹화 관리 등의 핵심 기능을 효과적으로 지원하도록 구성되어 있습니다. 
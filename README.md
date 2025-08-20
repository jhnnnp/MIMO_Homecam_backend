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

MIMO Camera Backend는 홈 카메라 시스템을 위한 확장 가능한 REST API 서버입니다. 실시간 비디오 스트리밍, 클라우드 저장소, 사용자 인증, 디바이스 관리를 제공합니다.

### 핵심 특징

- 🔐 **보안 우선**: JWT 인증, 이메일 인증, 레이트 리미팅
- 👥 **다중 사용자**: 이메일 기반 사용자 관리 및 권한 제어
- 📡 **실시간 통신**: WebSocket 기반 시그널링 서버 (준비 중)
- ☁️ **클라우드 네이티브**: S3 호환 저장소, 컨테이너화
- 📊 **모니터링**: 헬스체크, 구조화된 로깅
- 🏗️ **깔끔한 아키텍처**: Controller-Service 패턴으로 관심사 분리

## 🚀 주요 기능

### 인증 & 권한 관리
- 이메일/비밀번호 로그인
- Google OAuth 2.0 로그인
- JWT Access/Refresh Token 시스템
- 이메일 인증 시스템 (6자리 인증 코드)
- 세션 관리 및 디바이스별 권한 제어

### 디바이스 관리
- 카메라 디바이스 등록 및 관리
- 실시간 상태 모니터링 (온라인/오프라인)
- 디바이스 설정 및 메타데이터 관리
- 하트비트 시스템으로 연결 상태 추적

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

#### 카메라 API
```http
GET  /api/cameras                 # 카메라 목록 조회
POST /api/cameras                 # 새 카메라 등록
GET  /api/cameras/:id             # 카메라 상세 조회
PUT  /api/cameras/:id             # 카메라 업데이트
DELETE /api/cameras/:id           # 카메라 삭제
POST /api/cameras/:id/heartbeat   # 하트비트 전송
GET  /api/cameras/:id/stats       # 카메라 통계 조회
GET  /api/cameras/:id/live-stream # 라이브 스트림 정보
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

### 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Camera App    │    │   Viewer App    │    │   Web Dashboard │
│   (모바일)      │    │   (모바일)      │    │   (웹)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────────────────────────────┐
         │              MIMO Backend API                 │
         │  ┌─────────────┐  ┌─────────────┐            │
         │  │  REST API   │  │ WebSocket   │            │
         │  │   Server    │  │  Signaling  │            │
         │  │             │  │  (준비 중)   │            │
         │  └─────────────┘  └─────────────┘            │
         └───────────────────────────────────────────────┘
                                 │
    ┌─────────────┬──────────────┼──────────────┬─────────────┐
    │             │              │              │             │
┌───▼───┐    ┌───▼───┐    ┌─────▼─────┐    ┌───▼───┐    ┌───▼───┐
│ MySQL │    │ Email │    │    S3     │    │ Logs  │    │ JWT   │
│  DB   │    │Service│    │ Storage   │    │ Store │    │Tokens │
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
-- ========================================
-- MIMO Camera Database Setup Script
-- ========================================

-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS mimo_camera_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 2. 사용자 생성 및 권한 부여
CREATE USER IF NOT EXISTS 'mimo_user'@'%' IDENTIFIED BY 'mimo_secure_password_2024';
GRANT ALL PRIVILEGES ON mimo_camera_db.* TO 'mimo_user'@'%';
FLUSH PRIVILEGES;

-- 3. 데이터베이스 선택
USE mimo_camera_db;

-- 4. 테이블 존재 여부 확인 및 삭제 (기존 데이터 백업 필요시 주석 처리)
-- DROP TABLE IF EXISTS email_verifications;
-- DROP TABLE IF EXISTS refresh_tokens;
-- DROP TABLE IF EXISTS terms_agreements;
-- DROP TABLE IF EXISTS recordings;
-- DROP TABLE IF EXISTS events;
-- DROP TABLE IF EXISTS cameras;
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS settings;
-- DROP TABLE IF EXISTS users;

-- 5. 사용자 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    bio TEXT,
    phone VARCHAR(20),
    birth DATE,
    picture VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(255),
    google_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id)
);

-- 6. 약관 동의 테이블
CREATE TABLE IF NOT EXISTS terms_agreements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    agree_terms BOOLEAN DEFAULT FALSE,
    agree_privacy BOOLEAN DEFAULT FALSE,
    agree_microphone BOOLEAN DEFAULT FALSE,
    agree_location BOOLEAN DEFAULT FALSE,
    agree_marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. 이메일 인증 테이블
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verification_code (verification_code),
    INDEX idx_expires_at (expires_at)
);

-- 8. 리프레시 토큰 테이블
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- 9. 카메라 테이블
CREATE TABLE IF NOT EXISTS cameras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(255) UNIQUE,
    status ENUM('online', 'offline', 'error') DEFAULT 'offline',
    last_heartbeat TIMESTAMP NULL,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_device_id (device_id),
    INDEX idx_status (status)
);

-- 10. 이벤트 테이블
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camera_id INT NOT NULL,
    type ENUM('motion', 'sound', 'manual', 'scheduled') NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    duration INT DEFAULT 0,
    score DECIMAL(5,2) DEFAULT 0.00,
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
    INDEX idx_camera_id (camera_id),
    INDEX idx_started_at (started_at),
    INDEX idx_type (type),
    INDEX idx_is_pinned (is_pinned)
);

-- 11. 녹화 파일 테이블
CREATE TABLE IF NOT EXISTS recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    index INT DEFAULT 0,
    s3_key VARCHAR(500) NOT NULL,
    duration INT DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    format VARCHAR(10) DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_s3_key (s3_key)
);

-- 12. 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('motion', 'system', 'security', 'maintenance') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- 13. 설정 테이블
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notification BOOLEAN DEFAULT TRUE,
    sms_notification BOOLEAN DEFAULT FALSE,
    motion_sensitivity INT DEFAULT 50,
    recording_quality ENUM('low', 'medium', 'high') DEFAULT 'medium',
    storage_days INT DEFAULT 30,
    app_lock_enabled BOOLEAN DEFAULT FALSE,
    app_lock_pin VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- 14. 인덱스 최적화
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_events_camera_started ON events(camera_id, started_at);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);

-- 15. 권한 확인
SHOW GRANTS FOR 'mimo_user'@'%';

-- 16. 테이블 생성 확인
SHOW TABLES;

-- 17. 데이터베이스 상태 확인
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'mimo_camera_db'; 
-- ========================================
-- MIMO Camera Database Schema (Email Only)
-- ========================================

-- 기존 데이터베이스 삭제 및 재생성
DROP DATABASE IF EXISTS mimo_homecam_db;
CREATE DATABASE mimo_homecam_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE mimo_homecam_db;

-- ========================================
-- 1. 사용자 테이블 (User)
-- ========================================
CREATE TABLE User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(50) NOT NULL,
    nickname VARCHAR(50),
    bio TEXT,
    phone VARCHAR(20),
    birth DATE,
    picture TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(100) UNIQUE,
    provider VARCHAR(20) DEFAULT 'local',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_provider (provider)
);

-- ========================================
-- 2. 이메일 인증 테이블 (EmailVerification)
-- ========================================
CREATE TABLE EmailVerification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_verification_code (verification_code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_user_email (user_id, email)
);

-- ========================================
-- 3. 리프레시 토큰 테이블 (RefreshToken)
-- ========================================
CREATE TABLE RefreshToken (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- ========================================
-- 4. 약관 동의 테이블 (TermsAgreement)
-- ========================================
CREATE TABLE TermsAgreement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    agree_terms BOOLEAN DEFAULT FALSE,
    agree_privacy BOOLEAN DEFAULT FALSE,
    agree_microphone BOOLEAN DEFAULT FALSE,
    agree_location BOOLEAN DEFAULT FALSE,
    agree_marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

-- ========================================
-- 5. 카메라 테이블 (Camera)
-- ========================================
CREATE TABLE Camera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(255) UNIQUE,
    status ENUM('online', 'offline', 'error') DEFAULT 'offline',
    last_heartbeat TIMESTAMP NULL,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_device_id (device_id),
    INDEX idx_status (status)
);

-- ========================================
-- 6. 이벤트 테이블 (Event)
-- ========================================
CREATE TABLE Event (
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
    
    FOREIGN KEY (camera_id) REFERENCES Camera(id) ON DELETE CASCADE,
    INDEX idx_camera_id (camera_id),
    INDEX idx_started_at (started_at),
    INDEX idx_type (type),
    INDEX idx_is_pinned (is_pinned)
);

-- ========================================
-- 7. 녹화 파일 테이블 (Recording)
-- ========================================
CREATE TABLE Recording (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    index_num INT DEFAULT 0,
    s3_key VARCHAR(500) NOT NULL,
    duration INT DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    format VARCHAR(10) DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES Event(id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_s3_key (s3_key)
);

-- ========================================
-- 8. 알림 테이블 (Notification)
-- ========================================
CREATE TABLE Notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('motion', 'system', 'security', 'maintenance') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- ========================================
-- 9. 설정 테이블 (Settings)
-- ========================================
CREATE TABLE Settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notification BOOLEAN DEFAULT TRUE,
    motion_sensitivity INT DEFAULT 50,
    recording_quality ENUM('low', 'medium', 'high') DEFAULT 'medium',
    storage_days INT DEFAULT 30,
    app_lock_enabled BOOLEAN DEFAULT FALSE,
    app_lock_pin VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- ========================================
-- 인덱스 최적화
-- ========================================
CREATE INDEX idx_users_created_at ON User(created_at);
CREATE INDEX idx_events_camera_started ON Event(camera_id, started_at);
CREATE INDEX idx_notifications_user_created ON Notification(user_id, created_at);

-- ========================================
-- 테이블 생성 확인
-- ========================================
SHOW TABLES;

-- ========================================
-- 테이블 구조 확인
-- ========================================
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'mimo_homecam_db'
ORDER BY TABLE_NAME; 
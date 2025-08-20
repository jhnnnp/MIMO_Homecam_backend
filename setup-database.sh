#!/bin/bash

# ========================================
# MIMO Camera Database Setup Script
# ========================================

echo "🚀 MIMO Camera Database Setup 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# MySQL 연결 정보
MYSQL_HOST="localhost"
MYSQL_USER="root"
MYSQL_PASSWORD="5010"  # 현재 설정된 비밀번호
NEW_DB_USER="mimo_user"
NEW_DB_PASSWORD="mimo_secure_password_2024"
NEW_DB_NAME="mimo_camera_db"

echo -e "${BLUE}📋 현재 설정:${NC}"
echo "  MySQL Host: $MYSQL_HOST"
echo "  MySQL User: $MYSQL_USER"
echo "  새 DB User: $NEW_DB_USER"
echo "  새 DB Name: $NEW_DB_NAME"

# MySQL 연결 테스트
echo -e "\n${YELLOW}🔍 MySQL 연결 테스트...${NC}"
if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL 연결 성공${NC}"
else
    echo -e "${RED}❌ MySQL 연결 실패${NC}"
    echo "MySQL이 실행 중인지 확인하세요."
    exit 1
fi

# 기존 데이터베이스 백업 (존재하는 경우)
if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "USE $NEW_DB_NAME;" > /dev/null 2>&1; then
    echo -e "\n${YELLOW}⚠️  기존 데이터베이스 발견${NC}"
    read -p "기존 데이터베이스를 백업하시겠습니까? (y/n): " backup_choice
    
    if [[ $backup_choice == "y" || $backup_choice == "Y" ]]; then
        backup_file="mimo_backup_$(date +%Y%m%d_%H%M%S).sql"
        echo -e "${BLUE}💾 백업 생성 중: $backup_file${NC}"
        mysqldump -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$NEW_DB_NAME" > "$backup_file"
        echo -e "${GREEN}✅ 백업 완료: $backup_file${NC}"
    fi
fi

# SQL 스크립트 실행
echo -e "\n${BLUE}🗄️  데이터베이스 및 테이블 생성 중...${NC}"

# SQL 스크립트 실행 (비밀번호를 환경변수로 전달)
MYSQL_PWD="$MYSQL_PASSWORD" mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" < setup-database.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 데이터베이스 설정 완료${NC}"
else
    echo -e "${RED}❌ 데이터베이스 설정 실패${NC}"
    exit 1
fi

# 연결 테스트
echo -e "\n${YELLOW}🔍 새 데이터베이스 연결 테스트...${NC}"
if mysql -h "$MYSQL_HOST" -u "$NEW_DB_USER" -p"$NEW_DB_PASSWORD" -e "USE $NEW_DB_NAME; SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 새 데이터베이스 연결 성공${NC}"
else
    echo -e "${RED}❌ 새 데이터베이스 연결 실패${NC}"
    exit 1
fi

# 테이블 확인
echo -e "\n${BLUE}📊 생성된 테이블 확인:${NC}"
mysql -h "$MYSQL_HOST" -u "$NEW_DB_USER" -p"$NEW_DB_PASSWORD" -e "USE $NEW_DB_NAME; SHOW TABLES;"

echo -e "\n${GREEN}🎉 데이터베이스 설정이 완료되었습니다!${NC}"
echo -e "${BLUE}📝 다음 단계:${NC}"
echo "  1. .env 파일에서 데이터베이스 정보 업데이트"
echo "  2. npm run migrate 실행"
echo "  3. 서버 시작: npm start" 
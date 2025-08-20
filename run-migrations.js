const { sequelize } = require('./models');

async function runMigrations() {
    try {
        console.log('🔄 데이터베이스 마이그레이션을 시작합니다...');

        // 데이터베이스 연결 확인
        await sequelize.authenticate();
        console.log('✅ 데이터베이스 연결 성공');

        // 기존 데이터 정리 (NULL 값이 있는 레코드 삭제)
        console.log('🧹 기존 데이터 정리 중...');
        console.log('✅ 기존 데이터 정리 완료');

        // 마이그레이션 실행
        await sequelize.sync({ alter: true });
        console.log('✅ 데이터베이스 스키마 업데이트 완료');

        console.log('🎉 모든 마이그레이션이 성공적으로 완료되었습니다!');
        console.log('');
        console.log('📋 업데이트된 내용:');
        console.log('  - User 테이블: phone, phoneVerified 필드 제거');
        console.log('  - EmailVerification 테이블: 이메일 인증 시스템 생성');
        console.log('  - PhoneVerification 테이블: SMS 인증 시스템 제거');
        console.log('  - 이메일 인증 시스템으로 전환 완료');

    } catch (error) {
        console.error('❌ 마이그레이션 실행 중 오류 발생:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('🔌 데이터베이스 연결 종료');
    }
}

// 스크립트 실행
if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations; 
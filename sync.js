require('dotenv').config();
const { sequelize, User, Camera, Event, Recording, Settings, Notification, EmailVerification, RefreshToken } = require('./models');

async function syncDatabase() {
    try {
        console.log('🔄 데이터베이스 동기화 시작...');

        // 모든 모델 동기화
        await sequelize.sync({ force: true });

        console.log('✅ 데이터베이스 동기화 완료!');
        console.log('📋 생성된 테이블:');
        console.log('  - User');
        console.log('  - Camera');
        console.log('  - Event');
        console.log('  - Recording');
        console.log('  - Settings');
        console.log('  - Notification');
        console.log('  - EmailVerification');
        console.log('  - RefreshToken');

        // 테스트 사용자 생성
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('test123', 10);

        await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password_hash: hashedPassword,
            name: '테스트 사용자',
            phone: '010-1234-5678',
            emailVerified: true,
            provider: 'local'
        });

        console.log('👤 테스트 사용자 생성 완료');
        console.log('   이메일: test@example.com');
        console.log('   비밀번호: test123');

    } catch (error) {
        console.error('❌ 데이터베이스 동기화 실패:', error);
    } finally {
        await sequelize.close();
    }
}

syncDatabase(); 
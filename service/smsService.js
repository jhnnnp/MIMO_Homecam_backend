// service/smsService.js

/**
 * SMS 서비스 클래스 (Mock 구현)
 * 실제 SMS 발송 대신 콘솔에 로그를 출력합니다
 */
class SmsService {
    constructor() {
        this.isEnabled = process.env.ENABLE_SMS === 'true';
    }

    /**
     * SMS 발송 (Mock 구현)
     * @param {string} to - 수신자 번호
     * @param {string} message - 메시지 내용
     * @returns {Promise<Object>} 발송 결과
     */
    async sendSms(to, message) {
        try {
            if (!this.isEnabled) {
                console.log('📱 SMS 서비스가 비활성화되어 있습니다.');
                return { success: false, message: 'SMS 서비스가 비활성화되어 있습니다.' };
            }

            // Mock SMS 발송 - 실제로는 콘솔에만 출력
            console.log('📱 [MOCK SMS] 발송 시뮬레이션:');
            console.log(`   📞 수신자: ${to}`);
            console.log(`   📝 메시지: ${message}`);
            console.log('   ✅ SMS 발송 성공 (Mock)');

            return {
                success: true,
                sid: `mock_${Date.now()}`,
                message: 'SMS가 성공적으로 발송되었습니다. (Mock)'
            };

        } catch (error) {
            console.error('📱 SMS 발송 실패:', error.message);
            return { success: false, message: 'SMS 발송에 실패했습니다.', error: error.message };
        }
    }

    /**
     * 인증 코드 SMS 발송
     * @param {string} phoneNumber - 전화번호
     * @param {string} code - 인증 코드
     * @returns {Promise<Object>} 발송 결과
     */
    async sendVerificationCode(phoneNumber, code) {
        const message = `[MIMO Camera] 인증 코드: ${code}`;
        return await this.sendSms(phoneNumber, message);
    }

    /**
     * 비밀번호 재설정 SMS 발송
     * @param {string} phoneNumber - 전화번호
     * @param {string} code - 임시 비밀번호
     * @returns {Promise<Object>} 발송 결과
     */
    async sendPasswordResetCode(phoneNumber, code) {
        const message = `[MIMO Camera] 임시 비밀번호: ${code}`;
        return await this.sendSms(phoneNumber, message);
    }

    /**
     * SMS 서비스 상태 확인
     * @returns {Object} 서비스 상태
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            clientInitialized: true, // Mock 구현이므로 항상 true
            twilioConfigured: false, // Twilio 사용하지 않음
            mode: 'mock'
        };
    }
}

module.exports = new SmsService(); 
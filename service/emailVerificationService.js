const { EmailVerification, User } = require('../models');
const emailService = require('./emailService');
const { Op } = require('sequelize');

/**
 * 설명: 이메일 인증 코드 생성 및 발송
 * 입력: userId, email
 * 출력: { success: boolean, message: string }
 * 부작용: DB 저장, 이메일 발송
 * 예외: throw codes E_VALIDATION, E_EMAIL_SEND_FAILED
 */
async function sendVerificationEmail(userId, email) {
    try {
        // 기존 미인증 코드 삭제
        await EmailVerification.destroy({
            where: {
                userId,
                email,
                isVerified: false,
                expiresAt: {
                    [Op.lt]: new Date()
                }
            }
        });

        // 6자리 인증 코드 생성
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 만료 시간 설정 (10분)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // 인증 코드 저장
        await EmailVerification.create({
            userId,
            email,
            verificationCode,
            expiresAt
        });

        // 이메일 발송
        const emailContent = `
            <h2>HomeCam 이메일 인증</h2>
            <p>안녕하세요! HomeCam 서비스에 가입해주셔서 감사합니다.</p>
            <p>아래 인증 코드를 입력해주세요:</p>
            <h1 style="color: #007bff; font-size: 2em; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">${verificationCode}</h1>
            <p><strong>인증 코드는 10분 후 만료됩니다.</strong></p>
            <p>본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
            <hr>
            <p style="color: #6c757d; font-size: 0.9em;">HomeCam - 공기계를 활용한 스마트 홈캠 시스템</p>
        `;

        await emailService.sendEmail({
            to: email,
            subject: '[HomeCam] 이메일 인증 코드',
            html: emailContent
        });

        return {
            success: true,
            message: '인증 코드가 이메일로 발송되었습니다.'
        };

    } catch (error) {
        console.error('이메일 인증 코드 발송 실패:', error);
        throw new Error('이메일 인증 코드 발송에 실패했습니다.');
    }
}

/**
 * 설명: 이메일 인증 코드 확인
 * 입력: userId, email, verificationCode
 * 출력: { success: boolean, message: string }
 * 부작용: DB 업데이트
 * 예외: throw codes E_VALIDATION, E_EXPIRED, E_INVALID_CODE
 */
async function verifyEmailCode(userId, email, verificationCode) {
    try {
        // 인증 코드 조회
        const verification = await EmailVerification.findOne({
            where: {
                userId,
                email,
                verificationCode,
                isVerified: false
            }
        });

        if (!verification) {
            throw new Error('유효하지 않은 인증 코드입니다.');
        }

        // 만료 시간 확인
        if (new Date() > verification.expiresAt) {
            throw new Error('인증 코드가 만료되었습니다.');
        }

        // 인증 완료 처리
        await verification.update({
            isVerified: true,
            verifiedAt: new Date()
        });

        // 사용자 이메일 인증 상태 업데이트
        await User.update(
            { emailVerified: true },
            { where: { id: userId } }
        );

        return {
            success: true,
            message: '이메일 인증이 완료되었습니다.'
        };

    } catch (error) {
        console.error('이메일 인증 코드 확인 실패:', error);
        throw error;
    }
}

/**
 * 설명: 이메일 인증 상태 확인
 * 입력: userId, email
 * 출력: { isVerified: boolean }
 * 부작용: 없음
 * 예외: 없음
 */
async function checkEmailVerificationStatus(userId, email) {
    try {
        const verification = await EmailVerification.findOne({
            where: {
                userId,
                email,
                isVerified: true
            },
            order: [['verifiedAt', 'DESC']]
        });

        return {
            isVerified: !!verification
        };

    } catch (error) {
        console.error('이메일 인증 상태 확인 실패:', error);
        return {
            isVerified: false
        };
    }
}

/**
 * 설명: 만료된 인증 코드 정리
 * 입력: 없음
 * 출력: { deletedCount: number }
 * 부작용: DB 삭제
 * 예외: 없음
 */
async function cleanupExpiredVerifications() {
    try {
        const result = await EmailVerification.destroy({
            where: {
                expiresAt: {
                    [Op.lt]: new Date()
                }
            }
        });

        return {
            deletedCount: result
        };

    } catch (error) {
        console.error('만료된 인증 코드 정리 실패:', error);
        return {
            deletedCount: 0
        };
    }
}

module.exports = {
    sendVerificationEmail,
    verifyEmailCode,
    checkEmailVerificationStatus,
    cleanupExpiredVerifications
}; 
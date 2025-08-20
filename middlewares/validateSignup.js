const Joi = require('joi');

const signupSchema = Joi.object({
    email: Joi.string().email().required(),
    // 비밀번호: 8~16자, 소문자/숫자/특수문자 각각 1개 이상 포함
    password: Joi.string()
        .pattern(/^(?=.*[a-z])(?=.*\d)(?=.*[`~!@#$%^&*()\-_=+])[a-zA-Z\d`~!@#$%^&*()\-_=+]{8,16}$/)
        .required()
        .messages({
            'string.pattern.base': '비밀번호는 8~16자, 소문자/숫자/특수문자를 각각 1개 이상 포함해야 합니다.'
        }),
    name: Joi.string().min(2).max(20).required(),
    nickname: Joi.string().min(2).max(20).required(),
    birth: Joi.string().optional(), // 생년월일 (선택사항)
    // 약관 동의 필드들
    agreeTerms: Joi.boolean().required(),
    agreePrivacy: Joi.boolean().required(),
    agreeMicrophone: Joi.boolean().required(),
    agreeLocation: Joi.boolean().required(),
    agreeMarketing: Joi.boolean().optional(), // 마케팅 동의는 선택사항
});

module.exports = (req, res, next) => {
    const { error } = signupSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }
    next();
}; 
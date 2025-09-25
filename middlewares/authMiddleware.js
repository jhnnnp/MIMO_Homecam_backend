const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // 서명과 검증에 동일한 시크릿을 사용하도록 기본값(fallback) 일치
    const secret = process.env.JWT_ACCESS_SECRET || 'your_jwt_secret';

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};
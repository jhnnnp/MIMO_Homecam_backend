// googleStrategy.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
dotenv.config();

const authService = require('./authService');

console.log('📡 GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔑 accessToken:', accessToken);
      console.log('👤 profile:', profile);

      const email = profile.emails?.[0]?.value;
      const username = profile.displayName || email?.split('@')[0];

      if (!email) throw new Error('이메일 정보가 없습니다.');

      const user = await authService.findOrCreateUser(email, username, 'google');
      return done(null, user);
    } catch (err) {
      console.error('🔴 GoogleStrategy Error:', err.message);
      return done(err, null);
    }
  }
));

// 세션 기반 로그인용 (선택)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;

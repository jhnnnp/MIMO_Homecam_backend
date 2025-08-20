const sequelize = require('../config/db');
const User = require('./User');
const Camera = require('./Camera');
const Event = require('./Event');
const Recording = require('./Recording');
const Settings = require('./Settings');
const Notification = require('./Notification');

const RefreshToken = require('./RefreshToken');
const EmailVerification = require('./EmailVerification');
const TermsAgreement = require('./TermsAgreement');

// User - Camera (1:N)
User.hasMany(Camera, { foreignKey: 'user_id', as: 'cameras' });
Camera.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Camera - Event (1:N)
Camera.hasMany(Event, { foreignKey: 'camera_id', as: 'events' });
Event.belongsTo(Camera, { foreignKey: 'camera_id', as: 'camera' });

// Event - Recording (1:N)
Event.hasMany(Recording, { foreignKey: 'event_id', as: 'recordings' });
Recording.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// User - Settings (1:1)
User.hasOne(Settings, { foreignKey: 'user_id', as: 'settings' });
Settings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Notification (1:N)
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - RefreshToken (1:N)
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - TermsAgreement (1:1)
User.hasOne(TermsAgreement, { foreignKey: 'user_id', as: 'termsAgreement' });
TermsAgreement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - EmailVerification (1:N)
User.hasMany(EmailVerification, { foreignKey: 'user_id', as: 'emailVerifications' });
EmailVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });



module.exports = {
    sequelize,
    User,
    Camera,
    Event,
    Recording,
    Settings,
    Notification,

    RefreshToken,
    EmailVerification,
    TermsAgreement,
};

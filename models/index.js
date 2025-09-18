const sequelize = require('../config/db');
const User = require('./User');
const Camera = require('./Camera');
const Event = require('./Event');
const Recording = require('./Recording');
const Settings = require('./Settings');
const UserSettings = require('./UserSettings');
const UserCustomSettings = require('./UserCustomSettings');
const DevicePermissions = require('./DevicePermissions');
const Notification = require('./Notification');

const RefreshToken = require('./RefreshToken');
const EmailVerification = require('./EmailVerification');
const TermsAgreement = require('./TermsAgreement');

// User - Camera (1:N) - 소유자 관계
User.hasMany(Camera, { foreignKey: 'owner_id', as: 'ownedCameras' });
Camera.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// Camera - Event (1:N)
Camera.hasMany(Event, { foreignKey: 'camera_id', as: 'events' });
Event.belongsTo(Camera, { foreignKey: 'camera_id', as: 'camera' });

// Event - Recording (1:N)
Event.hasMany(Recording, { foreignKey: 'event_id', as: 'recordings' });
Recording.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Camera - Recording (1:N)
Camera.hasMany(Recording, { foreignKey: 'camera_id', as: 'recordings' });
Recording.belongsTo(Camera, { foreignKey: 'camera_id', as: 'camera' });

// User - Recording (1:N)
User.hasMany(Recording, { foreignKey: 'user_id', as: 'recordings' });
Recording.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Settings (1:1) - 기존 Settings 테이블
User.hasOne(Settings, { foreignKey: 'user_id', as: 'settings' });
Settings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - UserSettings (1:1) - 새로운 고정 설정 테이블
User.hasOne(UserSettings, { foreignKey: 'user_id', as: 'userSettings' });
UserSettings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - UserCustomSettings (1:N) - 새로운 커스텀 설정 테이블
User.hasMany(UserCustomSettings, { foreignKey: 'user_id', as: 'customSettings' });
UserCustomSettings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// DevicePermissions 관계 정의
// Camera - DevicePermissions (1:N)
Camera.hasMany(DevicePermissions, { foreignKey: 'camera_id', as: 'permissions' });
DevicePermissions.belongsTo(Camera, { foreignKey: 'camera_id', as: 'camera' });

// User - DevicePermissions (1:N) - 사용자에게 부여된 권한
User.hasMany(DevicePermissions, { foreignKey: 'user_id', as: 'devicePermissions' });
DevicePermissions.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - DevicePermissions (1:N) - 사용자가 부여한 권한
User.hasMany(DevicePermissions, { foreignKey: 'granted_by', as: 'grantedPermissions' });
DevicePermissions.belongsTo(User, { foreignKey: 'granted_by', as: 'grantor' });

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
    UserSettings,
    UserCustomSettings,
    DevicePermissions,
    Notification,

    RefreshToken,
    EmailVerification,
    TermsAgreement,
};

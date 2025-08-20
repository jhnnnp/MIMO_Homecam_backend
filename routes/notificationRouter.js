const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');

router.get('/', NotificationController.getNotifications);
router.post('/', NotificationController.createNotification);

module.exports = router;

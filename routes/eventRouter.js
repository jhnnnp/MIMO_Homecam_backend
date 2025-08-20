const express = require('express');
const router = express.Router();
const EventController = require('../controllers/EventController');

router.get('/', EventController.getEvents);
router.get('/stats', EventController.getEventStats);
router.get('/:id', EventController.getEventById);

module.exports = router;

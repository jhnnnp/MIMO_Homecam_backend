const express = require('express');
const router = express.Router();
const RecordingController = require('../controllers/RecordingController');

router.get('/', RecordingController.getRecordings);
router.get('/:id', RecordingController.getRecordingById);

module.exports = router;

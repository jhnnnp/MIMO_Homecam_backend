// RecordingController.js
const { Recording } = require('../models');

exports.getRecordings = async (req, res) => {
    try {
        const recordings = await Recording.findAll({
            where: { user_id: req.user.userId },
            order: [['created_at', 'DESC']]
        });
        res.json({ recordings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recordings' });
    }
};

exports.getRecordingById = async (req, res) => {
    try {
        const { id } = req.params;
        const recording = await Recording.findOne({
            where: { id, user_id: req.user.userId }
        });
        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }
        res.json({ recording });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recording' });
    }
};

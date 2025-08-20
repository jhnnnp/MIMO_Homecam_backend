const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// 테스트 엔드포인트
app.get('/', (req, res) => {
    res.json({ message: 'Backend API is running' });
});

app.get('/api/events', (req, res) => {
    res.json({
        data: [
            {
                id: 1,
                type: 'motion',
                camera_id: 1,
                confidence: 0.95,
                acknowledged: false,
                timestamp: new Date(),
                image_url: 'https://example.com/image1.jpg'
            }
        ],
        pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
        }
    });
});

app.get('/api/cameras', (req, res) => {
    res.json({
        cameras: [
            {
                id: 1,
                user_id: 1,
                name: 'Living Room Cam',
                location: '거실',
                status: 'online',
                last_seen: new Date(),
                firmware: '2.1.3'
            }
        ]
    });
});

const PORT = 4001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
}); 
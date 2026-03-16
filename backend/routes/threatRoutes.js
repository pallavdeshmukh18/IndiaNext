const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
    analyzeThreat,
    quickAnalyzeThreat,
    analyzeSecuritySuite,
    analyzeLiveScreenThreat,
    analyzeVideoThreat
} = require('../controllers/threatController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
        if (file?.mimetype?.startsWith('image/')) {
            return callback(null, true);
        }

        return callback(new Error('Only image files are allowed for image upload.'));
    }
});

const parseSuiteUpload = (req, res, next) => {
    const handler = upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'imageFile', maxCount: 1 }
    ]);

    handler(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'Uploaded image exceeds 10MB limit.'
            });
        }

        return res.status(400).json({
            error: error.message || 'Invalid image upload payload.'
        });
    });
};

// POST /api/threats/quick-analyze
router.post('/quick-analyze', quickAnalyzeThreat);

// POST /api/threats/analyze
router.post('/analyze', analyzeThreat); // temporarily disabled protect for internal node testing

// POST /api/threats/suite-analyze
router.post('/suite-analyze', parseSuiteUpload, analyzeSecuritySuite);

// POST /api/threats/live-screen-analyze
router.post('/live-screen-analyze', analyzeLiveScreenThreat);

// POST /api/threats/video-ai-likelihood
router.post('/video-ai-likelihood', analyzeVideoThreat);

module.exports = router;

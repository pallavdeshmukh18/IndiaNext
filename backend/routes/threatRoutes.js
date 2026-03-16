const express = require('express');
const router = express.Router();
const { analyzeThreat, quickAnalyzeThreat } = require('../controllers/threatController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/threats/quick-analyze
router.post('/quick-analyze', quickAnalyzeThreat);

// POST /api/threats/analyze
router.post('/analyze', protect, analyzeThreat);

module.exports = router;

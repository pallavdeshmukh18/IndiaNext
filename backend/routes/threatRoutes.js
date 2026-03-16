const express = require('express');
const router = express.Router();
const { analyzeThreat } = require('../controllers/threatController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/threats/analyze
router.post('/analyze', analyzeThreat); // temporarily disabled protect for internal node testing

module.exports = router;

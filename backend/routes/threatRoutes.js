const express = require('express');
const router = express.Router();
const { analyzeThreat } = require('../controllers/threatController');

// POST /api/threats/analyze
router.post('/analyze', analyzeThreat);

module.exports = router;

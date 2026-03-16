const express = require('express');
const router = express.Router();
const {
    analyzeThreat,
    quickAnalyzeThreat,
    analyzeSecuritySuite
} = require('../controllers/threatController');

// POST /api/threats/quick-analyze
router.post('/quick-analyze', quickAnalyzeThreat);

// POST /api/threats/analyze
router.post('/analyze', analyzeThreat); // temporarily disabled protect for internal node testing

// POST /api/threats/suite-analyze
router.post('/suite-analyze', analyzeSecuritySuite);

module.exports = router;

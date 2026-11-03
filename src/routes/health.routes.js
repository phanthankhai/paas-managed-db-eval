const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Liveness Probe: /healthz
router.get('/healthz', healthController.getLiveness);

// Readiness Probe: /readyz
router.get('/readyz', healthController.getReadiness);

module.exports = router;


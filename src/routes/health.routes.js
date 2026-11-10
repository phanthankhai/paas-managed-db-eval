const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Liveness Probe: /healthz
router.get('/healthz', healthController.getLiveness);

// Readiness Probe: /readyz
router.get('/readyz', healthController.getReadiness);

// Simulation endpoints for UI & test automation
router.get('/api/simulate-failure', healthController.getSimulateFailureStatus);
router.post('/api/simulate-failure', healthController.toggleSimulateFailure);

module.exports = router;


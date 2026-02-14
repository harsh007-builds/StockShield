const router = require('express').Router();
const ctrl = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/dashboard', auth, ctrl.dashboard);
router.get('/consumption-summary', auth, ctrl.consumptionSummary);
router.get('/top-consumed', auth, ctrl.topConsumed);
router.get('/low-stock', auth, ctrl.lowStockComponents);
router.get('/consumption-timeline', auth, ctrl.consumptionTimeline);

module.exports = router;

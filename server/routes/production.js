const router = require('express').Router();
const ctrl = require('../controllers/productionController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.produce);
router.get('/history', auth, ctrl.getHistory);
router.get('/:id/consumption', auth, ctrl.getConsumptionByEntry);

module.exports = router;

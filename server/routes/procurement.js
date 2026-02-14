const router = require('express').Router();
const ctrl = require('../controllers/procurementController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.put('/:id/resolve', auth, ctrl.resolve);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/pcbController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

// Component mapping
router.post('/:id/components', auth, ctrl.addComponent);
router.put('/:id/components/:mappingId', auth, ctrl.updateComponent);
router.delete('/:id/components/:mappingId', auth, ctrl.removeComponent);

module.exports = router;

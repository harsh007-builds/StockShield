const router = require('express').Router();
const ctrl = require('../controllers/excelController');
const auth = require('../middleware/auth');

router.post('/import', auth, ctrl.upload.single('file'), ctrl.importInventory);
router.get('/export/inventory', auth, ctrl.exportInventory);
router.get('/export/consumption', auth, ctrl.exportConsumption);

module.exports = router;

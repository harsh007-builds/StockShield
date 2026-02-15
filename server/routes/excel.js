const router = require('express').Router();
const ctrl = require('../controllers/excelController');
const auth = require('../middleware/auth');

router.post('/import', auth, (req, res, next) => {
    ctrl.upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, ctrl.importInventory);
router.get('/export/inventory', auth, ctrl.exportInventory);
router.get('/export/consumption', auth, ctrl.exportConsumption);

module.exports = router;

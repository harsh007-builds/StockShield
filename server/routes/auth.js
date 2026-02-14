const router = require('express').Router();
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', auth, ctrl.register); // Only authenticated users can register new users
router.get('/me', auth, ctrl.me);

module.exports = router;

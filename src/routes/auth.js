const { Router } = require('express');

const auth = require('../controllers/auth')
const authMiddleware = require('../middlewares/auth')
const m = require('../middlewares/middleware')
const router = Router();

router.post('/login', m.db, auth.login);
router.post('/register', m.db, auth.register);
router.get('/me', m.db, authMiddleware, auth.me);
router.post('/get_login', m.db, auth.get_login);
module.exports = router;

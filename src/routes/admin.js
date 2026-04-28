const { Router } = require('express')
const userController = require('../controllers/admin/user')
const m = require('../middlewares/middleware')
const auth = require('../middlewares/auth')
const authorization = require('../middlewares/authorization')
const profileController = require('../controllers/admin/profile')

const router = Router();

router.get('/users/getList', m.db, auth, authorization("admin"), userController.getList);
router.get('/users/getSingle/:hash', m.db, auth, authorization("admin"), userController.getSingle);
router.post('/users/create', m.db, auth, authorization("admin"), userController.create);
router.put('/users/update/:hash', m.db, auth, authorization("admin"), userController.update);
router.delete('/users/delete/:hash', m.db, auth, authorization("admin"), userController.delete);

router.post('/me', m.db, auth, profileController.get);
module.exports = router;
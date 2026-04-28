const { Router } = require('express')

const routes = require('../routes');

const router = Router();
router.use('/auth', routes.auth);
router.use('/admin', routes.admin);
router.use('/tasks', routes.task);
router.use('/projects', routes.project);

router.use(routes.route404);
router.use(routes.route500);

module.exports = router;
const { Router } = require('express')
const auth = require('../middlewares/auth')
const m = require('../middlewares/middleware')

const authorizeProjectRole = require('../middlewares/authorizeProjectRole');
const authorization = require('../middlewares/authorization');

const memberController = require('../controllers/projects/member');
const projectController = require('../controllers/projects/project');
const taskController = require('../controllers/projects/task');

const router = Router();

router.get('/project', m.db, auth, projectController.getList);
router.get('/project/:hash', m.db, auth, projectController.get);
router.post('/project', m.db, auth, authorization('admin', 'super-admin'), projectController.create);
router.put('/project/update/:hash', m.db, auth, authorizeProjectRole('manager'), projectController.update);
router.delete('/project/delete/:hash', m.db, auth, authorization('admin', 'super-admin'), projectController.delete);

router.get('/:projectId/members', m.db, auth, authorizeProjectRole('manager', 'member'), memberController.get);
router.post('/:projectId/members', m.db, auth, authorizeProjectRole('manager'), memberController.add);
router.delete('/:projectId/members/:userId', m.db, auth, authorizeProjectRole('manager'), memberController.remove);

router.get('/:projectId/task', m.db, auth, authorizeProjectRole('manager', 'member'), taskController.getList);
router.get('/:projectId/task/:taskId', m.db, auth, authorizeProjectRole('manager', 'member'), taskController.getSingle);
router.post('/:projectId/task', m.db, auth, authorizeProjectRole('manager', 'member'), taskController.create);
router.put('/:projectId/task/:taskId', m.db, auth, taskController.update);
router.patch('/:projectId/task/:taskId/status', m.db, auth, taskController.updateStatus);
router.delete('/:projectId/task/:taskId', m.db, auth, authorizeProjectRole('manager'), taskController.delete);

module.exports = router;
const { Router } = require('express')
const auth = require('../middlewares/auth')
const m = require('../middlewares/middleware')

const authorizeProjectRole = require('../middlewares/authorizeProjectRole')

const memberController = require('../controllers/projects/member')
const projectController = require('../controllers/projects/project')
const taskController = require('../controllers/projects/task')

const router = Router()

// Project
router.get('/project', m.db, auth, projectController.getList)
router.get('/project/:hash', m.db, auth, projectController.get)

// FIX: normal logged-in user can create project
router.post('/project', m.db, auth, projectController.create)

router.put(
  '/project/update/:projectId',
  m.db,
  auth,
  authorizeProjectRole(['manager']),
  projectController.update
)

router.delete(
  '/project/delete/:projectId',
  m.db,
  auth,
  authorizeProjectRole(['manager']),
  projectController.delete
)

// Members
router.get('/:projectId/members', m.db, auth, authorizeProjectRole('manager', 'member'), memberController.get)
router.post('/:projectId/members', m.db, auth, authorizeProjectRole('manager'), memberController.add)
router.delete('/:projectId/members/:userId', m.db, auth, authorizeProjectRole('manager'), memberController.remove)

// Tasks
router.get('/:projectId/task', m.db, auth, authorizeProjectRole('manager', 'member'), taskController.getList)
router.get('/:projectId/task/:taskId', m.db, auth, authorizeProjectRole('manager', 'member'), taskController.getSingle)
router.post('/:projectId/task', m.db, auth, authorizeProjectRole('manager', 'member'), taskController.create)
router.put('/:projectId/task/:taskId', m.db, auth, taskController.update)
router.patch('/:projectId/task/:taskId/status', m.db, auth, taskController.updateStatus)
router.delete('/:projectId/task/:taskId', m.db, auth, authorizeProjectRole('manager'), taskController.delete)

module.exports = router
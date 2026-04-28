const { Router } = require('express')
const auth = require('../middlewares/auth')
const m = require('../middlewares/middleware');

const taskController = require('../controllers/tasks/task')
const commentController = require('../controllers/tasks/comment');

const router = Router();

router.get('/get', m.db, auth, taskController.getSingle);
router.post('/create', m.db, auth, taskController.create);

router.get('/:taskId/comments', m.db, auth, commentController.get);
router.post('/:taskId/comments', m.db, auth, commentController.add);
router.put('/:taskId/comments/:commentId', m.db, auth, commentController.update);
router.delete('/:taskId/comments/:commentId', m.db, auth, commentController.remove);

module.exports = router;
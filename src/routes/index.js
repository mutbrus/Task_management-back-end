exports.auth = require('./auth');
exports.admin = require('./admin');
exports.task = require('./task')
exports.project = require('./project')

const error = require('../controllers/error');
exports.route404 = error.error404;
exports.route500 = error.error500;
exports.routeLimit = error.errorLimit;
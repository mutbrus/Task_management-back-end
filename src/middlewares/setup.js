const cache = require('../configs/cache');
const functions = require('../functions');

module.exports = async (req, res, next) => {
    req.f = functions;
    req.ip = functions.getIP(req.headers);
    res.cache = cache;
    res.set('Server', 'MISTI Server');
    res.set('X-Powered-By', 'MISTI Server');
    next();
}
module.exports = (...allowRoles) => {
    return (req, res, next) => {
        const userRole = req.user_role;

        if (!allowRoles.includes(userRole)) {
            return res.json(req.f.json.fail(403, 'Access denied: insufficient permissions'));
        }
        next();
    }
}
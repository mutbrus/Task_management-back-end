module.exports = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.user_id;
            const { projectId } = req.params;
            const parsedProjectId = parseInt(projectId, 10);
            
            if (isNaN(parsedProjectId)) {
                return res.json(req.f.json.fail("A valid Project ID is required in the URL."));
            }

            const sql = 'SELECT role FROM project_members WHERE user_id = ? AND project_id = ?';
            const [rows] = await req.db.query(sql, [userId, projectId]);

            if (rows.length === 0) return res.json(req.f.json.fail('Access Denied: You are not a member of this project.'));
            const userProjectRole = rows[0].role;

            if(allowedRoles.includes(userProjectRole)) {
                return next();
            } else {
                return res.json(req.f.json.fail('Permission Denied: Your role in this project does not permit this action.'));
            }
        } catch (error) {
            console.error('Authorization middleware error:', error);
            return res.json(req.f.json.error('An internal error occurred during authorization.'));
        }
    }
}
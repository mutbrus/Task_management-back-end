exports.add = async (req, res) => {
    const { projectId } = req.params;
    const { userId, role } = req.body;

    if(!userId || !role) return res.json(req.f.json.fail('Both userId and role are required.'));
    if(!['manager', 'member'].includes(role)) return res.json(req.f.json.fail('Invalid role specified.'));

    try {
        const sql = `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?);`;
        await req.db.query(sql, [projectId, userId, role]);

        return res.json(req.f.json.success('User successfully added to the project.'));
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.json(req.f.json.fail('This user is already a member of the project.'));
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.json(req.f.json.fail('The specified user or project does not exist.'));
        }
        console.error('Error adding user to project:', error);
        return res.json(req.f.json.error(error.message));
    }
}

exports.remove = async (req, res) => {
    const { projectId, userId } = req.params;
    const removerUserId = req.user_id;

    if (removerUserId.toString() === userId) {
        return res.json(req.f.json.fail('You cannot remove yourself from a project.'));
    }

    try {
        const sql = 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?;';
        const [result] = await req.db.query(sql, [projectId, userId]);

        if (result.affectedRows === 0) {
            return res.json(req.f.json.fail('The specified user is not a member of this project.'));
        }

        return res.json(req.f.json.success('User remove successfully.'))
    } catch (err) {
        console.log('Error removing user from project: ', err);
        return res.json(req.f.json.error(err.message));
    }
}

exports.get = async (req, res) => {
    const { projectId } = req.params;

    try {
        const sql = `SELECT u.user_id, u.full_name, u.email, pm.role FROM users u
            JOIN project_members pm ON u.user_id = pm.user_id
            WHERE pm.project_id = ?;
        `;

        const [members] = await req.db.query(sql, [projectId]);

        return res.json(req.f.json.success(members));
    } catch (error) {
        console.error('Error fetching project member: ', error);
        return res.json(req.f.json.error('Failed to fetch project members.'));
    }
}
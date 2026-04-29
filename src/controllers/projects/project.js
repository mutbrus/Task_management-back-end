exports.get = async (req, res) => {
    const { hash } = req.params;
    const sql = `
        SELECT
            project_id,
            pj_hash,
            pj_name,
            description,
            owner_id
        FROM projects WHERE pj_hash = ? LIMIT 1
    `;

    try {
        const [result] = await req.db.query(sql, [hash]);
        if(result.length === 0) return res.json(req.f.json.fail('Project not found!'));

        const project = result[0];
        return res.json(req.f.json.success(project));
    } catch (err) {
        console.error('Database Error: ', err);
        return res.json(req.f.json.error('Database error'));
    }
}

exports.create = async (req, res) => {
    const { pj_name, description } = req.body;

    if (!pj_name || typeof pj_name !== 'string' || pj_name.trim() === '') {
        return res.json(req.f.json.fail('Missing required field.'));
    }

    if (!description || typeof description !== 'string') {
        return res.json(req.f.json.fail('description is required'));
    }

    const ownerId = req.user_id;
    const hash = req.f.generate();
    try {
        await req.db.beginTransaction();

        const sql = `INSERT INTO projects (pj_hash, pj_name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`;
        const values = [hash, pj_name, description, ownerId];
        const [result] = await req.db.query(sql, values);
        const newProjectId = result.insertId;

        const memberInsertSql = `
            INSERT INTO project_members (project_id, user_id, role)
            VALUES (?, ?, 'manager');
        `;
        const memValues = [newProjectId, ownerId];
        await req.db.query(memberInsertSql, memValues);

        const [newProjectRows] = await req.db.query('SELECT * FROM  projects WHERE project_id = ?', [newProjectId]);
        const newProject = newProjectRows[0];

        await req.db.commit();
        res.json(req.f.json.success(newProject));
    } catch (error) {
        await req.db.rollback();
        console.error('Error creating project: ', error);
        return res.json(req.f.json.error('Database Error'));
    }
}

exports.getList = async (req, res) => {
    const userId = req.user_id;
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;

    const safePage = page > 0 ? page : 1;
    const safeSize = size > 0 ? size : 10;

    const offset = (safePage - 1) * safeSize;

    try {
        const countSql = `SELECT COUNT(*) as total FROM project_members WHERE user_id = ?`;

        const dataSql = `
            SELECT p.*
            FROM projects p
            JOIN project_members pm ON p.project_id = pm.project_id
            WHERE pm.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?;
        `;

        const [countResult, dataResult] = await Promise.all([
            req.db.query(countSql, [userId]),
            req.db.query(dataSql, [userId, safeSize, offset])
        ]);

        const [countRows] = countResult;
        const [projects] = dataResult;

        const totalItems = countRows[0].total;
        const response = {
            data : projects,
            pagination: {
                totalItems: totalItems,
                totalPage: Math.ceil(totalItems / safeSize),
                currentPage: safePage,
                pageSize: safeSize,
            }
        }

        return res.json(req.f.json.success(response));
    } catch (err) {
        console.error('Database error', err);
        return res.json(req.f.json.error('Database error'));
    }
}

exports.update = async (req, res) => {
    const { projectId } = req.params;
    const { pj_name, description } = req.body;

    if (!projectId || isNaN(parseInt(projectId, 10))) {
        return res.json(req.f.json.fail('A valid Project ID is required in the URL.'));
    }

    if (!pj_name && description === undefined) {
        return res.json(req.f.json.fail('Missing field required'));
    }

    try {
        const updateFields = [];
        const queryValues = [];

        if (pj_name) {
            updateFields.push('pj_name = ?');
            queryValues.push(pj_name);
        }

        if (description !== undefined) {
            updateFields.push('description = ?');
            queryValues.push(description);
        }

        updateFields.push('updated_at = NOW()');

        const setClause = updateFields.join(', ');
        queryValues.push(projectId);

        const sql = `UPDATE projects SET ${setClause} WHERE project_id = ?`;

        await req.db.query(sql, queryValues);

        const [result] = await req.db.query(
            'SELECT * FROM projects WHERE project_id = ?',
            [projectId]
        );

        if (result.length === 0) {
            return res.json(req.f.json.fail('Project not found.'));
        }

        return res.json(req.f.json.success(result[0]));
    } catch (err) {
        console.error('Database error', err);
        return res.json(req.f.json.error('Database Error'));
    }
};

exports.delete = async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user_id;

    if (!projectId || isNaN(parseInt(projectId, 10))) {
        return res.json(req.f.json.fail('A valid Project ID is required in the URL.'));
    }

    await req.db.beginTransaction();

    try {
        const [proRow] = await req.db.query(
            'SELECT project_id, owner_id FROM projects WHERE project_id = ? FOR UPDATE;',
            [projectId]
        );

        if (proRow.length === 0) {
            await req.db.rollback();
            return res.json(req.f.json.fail('Project not found'));
        }

        const project = proRow[0];

        if (project.owner_id !== userId) {
            await req.db.rollback();
            return res.json(req.f.json.fail('Permission Denied: You are not the owner of this project'));
        }

        const [taskRows] = await req.db.query(
            'SELECT task_id FROM tasks WHERE project_id = ?',
            [projectId]
        );

        const taskIds = taskRows.map(t => t.task_id);

        if (taskIds.length > 0) {
            await req.db.query('DELETE FROM comments WHERE task_id IN (?)', [taskIds]);
            await req.db.query('DELETE FROM attachments WHERE task_id IN (?)', [taskIds]);
            await req.db.query('DELETE FROM task_dependencies WHERE task_id IN (?) OR depend_on_task_id IN (?)', [taskIds, taskIds]);
            await req.db.query('DELETE FROM task_assignees WHERE task_id IN (?)', [taskIds]);
            await req.db.query('DELETE FROM activity_log WHERE task_id IN (?)', [taskIds]);
        }

        await req.db.query('DELETE FROM tasks WHERE project_id = ?', [projectId]);
        await req.db.query('DELETE FROM activity_log WHERE project_id = ?', [projectId]);
        await req.db.query('DELETE FROM project_members WHERE project_id = ?', [projectId]);
        await req.db.query('DELETE FROM projects WHERE project_id = ?', [projectId]);

        await req.db.commit();

        return res.json(req.f.json.success('Project deleted successfully'));
    } catch (err) {
        await req.db.rollback();
        console.error('Database error: ', err);
        return res.json(req.f.json.error('Database error'));
    }
};
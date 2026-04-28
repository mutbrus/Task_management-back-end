exports.add = async (req, res) => {
    const { taskId } = req.params;
    const commenterId = req.user_id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
        return res.json(req.f.json.fail("Comment content cannot be empty."));
    }

    try {
        const [taskRows] = await req.db.query('SELECT project_id FROM tasks WHERE task_id = ?', [taskId]);

        if (taskRows.length === 0) {
            return res.json(req.f.json.fail('The specified task does not exist.'));
        }

        const projectId = taskRows[0].project_id;
        const [memberRows] = await req.db.query('SELECT role FROM project_members WHERE user_id = ? AND project_id = ?', [commenterId, projectId]);

        if (memberRows.length === 0) {
            return res.json(req.f.json.fail("Access Denied: You are not a member of this task's project."));
        }

        const com_hash = req.f.generate();
        const commentSql = 'INSERT INTO comments (task_id, user_id, com_hash, content) VALUES (?, ?, ?, ?);';
        const [result] = await req.db.query(commentSql, [taskId, commenterId, com_hash, content]);
        const [newCommentRole] = await req.db.query('SELECT * FROM comments WHERE com_id = ?', [result.insertId]);

        return res.json(req.f.json.success(newCommentRole[0]));
    } catch (err) {
        console.error('Error adding comment:', err);
        return res.json(req.f.json.error(err.message));
    }
}

exports.get = async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user_id;

    try {
        const [taskRows] = await req.db.query('SELECT project_id FROM tasks WHERE task_id = ?', [taskId]);

        if (taskRows.length === 0) {
            return res.json(req.f.json.fail('The specified task does not exist.'));
        }

        const projectId = taskRows[0].project_id;
        const [memberRows] = await req.db.query('SELECT role FROM project_members WHERE user_id = ? AND project_id = ?', [userId, projectId]);
        if (memberRows.length === 0) {
            return res.json(req.f.json.fail(403, "Access Denied: You are not a member of this task's projectId."));
        }

        const commentSql = `SELECT c.*, u.full_name as author_name FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.task_id = ?;
        `;

        const [comments] = await req.db.query(commentSql, [taskId]);

        return res.json(req.f.json.success(comments));
    } catch (err) {
        console.error('Error fetching comments:', err);
        return res.json(req.f.json.error(err.message));
    }
}

exports.update = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user_id;
    const { content } = req.body;

    if (!content) {
        return res.json(req.f.json.fail("Content is required."));
    }

    try {
        const [commentRows] = await req.db.query('SELECT user_id FROM comments WHERE com_id = ?', [commentId]);
        if (commentRows.length === 0) {
            return res.json(req.f.json.fail(404, "Comment not found."));
        }
        const originalAuthorId = commentRows[0].user_id;

        if (originalAuthorId !== userId) {
            return res.json(req.f.json.fail(403, "Permission Denied: You can only edit your own comments."));
        }

        const sql = 'UPDATE comments SET content = ? WHERE com_id = ?;';
        await req.db.query(sql, [content, commentId]);

        const [updatedComment] = await req.db.query('SELECT * FROM comments WHERE com_id = ?', [commentId]);
        return res.json(req.f.json.success(updatedComment[0]));

    } catch (error) {
        console.error('Error updating comment:', error);
        return res.json(req.f.json.error('Failed to update comment.'))
    }
}

exports.remove = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user_id;

    try {
        const sql = `
            SELECT c.user_id AS author_id, t.project_id
            FROM comments c
            JOIN tasks t ON c.task_id = t.task_id
            WHERE c.com_id = ?;
        `;
        const [rows] = await req.db.query(sql, [commentId]);
        if (rows.length === 0) return res.status(404).json(req.f.json.fail(404, "Comment not found."));

        const { author_id, project_id } = rows[0];
        const [memberRows] = await req.db.query('SELECT role FROM project_members WHERE user_id = ? AND project_id = ?', [userId, project_id]);
        const userProjectRole = memberRows.length > 0 ? memberRows[0].role : null;

        if (author_id !== userId && userProjectRole !== 'project manager') {
            return res.status(403).json(req.f.json.fail(403, "Permission Denied: You must be the author or a project manager to delete this comment."));
        }

        const updateSql = "UPDATE comments SET is_deleted = TRUE, content = 'This comment has been removed.' WHERE com_id = ?;";
        await req.db.query(updateSql, [commentId]);

        return res.json(req.f.json.success("Comment update successfully."))

    } catch (error) {
        console.error('Error deleting comment.', error);
        return res.json(req.f.json.error('Failed to delete comment.'));
    }
}
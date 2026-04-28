exports.getList = (req, res) => {
    return res.json(req.f.json.success());
}

exports.getSingle = (req, res) => {
    return res.json(req.f.json.success());
}

exports.create = (req, res) => {
    let project_id = req.body.project_id;
    let title = req.body.title;
    let description = req.body.description;
    let due_date = req.body.due_date;
    let priority = req.body.priority || 'Low';
    let status_id = req.body.status_id;
    let creator_id = req.body.creator_id;
    let parent_task_id = req.body.parent_task_id || null;
    let assignee_user_id = req.body.assignee_user_id || null;
    let task_hash = req.f.generate();

    if (
        !project_id ||
        !title ||
        !status_id ||
        !creator_id
    ) return res.json(req.f.json.fail('Missing required field'));

    const insertQuery = `
        INSERT INTO tasks (
            project_id,
            task_hash,
            title,
            description,
            status_id,
            priority,
            creator_id,
            due_date,
            parent_task_id
        ) VALUES (?,?,?,?,?,?,?,?,?)`;

    const values = [
        project_id,
        task_hash,
        title,
        description,
        status_id,
        priority,
        creator_id,
        due_date,
        parent_task_id
    ];

    req.db.query(insertQuery, values, (err, results) => {
        console.log("DB Insert Error:", err);
        if (err) return res.json(req.f.json.fail("database error"));
        const newTaskId = results.insertId;
        console.log({newTaskId})

        // req.db.query(`SELECT * FROM tasks WHERE task_id = ?`, [newTaskId], (err2, rows) => {
        //     if (err2) return res.json(req.f.json.fail('database 2 error'));

        //     const newTask = rows[0];

        //     if (assignee_user_id) {
        //         const assignQuery = `INSERT INTO task_assignees (user_id, task_id) VALUES (?, ?)`;
        //         req.db.query(assignQuery, [assignee_user_id, newTaskId], (err3) => {
        //             if (err3) return res.json(req.f.json.fail('database 3 error'));

        //             return res.json(req.f.json.success(newTask, "Task created and assigned successfully!"));
        //         });
        //     } else {
        //         return res.json(req.f.json.success(newTask));
        //     }
        // });
    });
}

exports.update = (req, res) => {
    return res.json(req.f.json.success());
}

exports.delete = (req, res) => {
    return res.json(req.f.json.success());
}
exports.getList = async (req, res) => {
  const { projectId } = req.params;
  try {
    const { status, priority, assignee, sortBy, sortOrder } = req.query;
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const safePage = page > 0 ? page : 1;
    const safeSize = size > 0 ? size : 10;

    const offset = (safePage - 1) * safeSize;

    let whereClause = ["t.project_id = ?"];
    let queryValues = [projectId];
    let joins = "";

    if (status) {
      whereClause.push("t.status_id = ?");
      queryValues.push(status);
    }

    if (priority) {
      whereClause.push("ta.user_id = ?");
      queryValues.push(priority);
    }
    if (assignee) {
      joins = "JOIN task_assignees ta ON t.task_id = ta.task_id";
      whereClause.push("ta.user_id = ?");
      queryValues.push(assignee);
    }

    const whereString = whereClause.join(" AND ");
    const sortableColumns = {
      dueDate: "t.due_date",
      createdAt: "t.created_at",
      priority: `FIELD(t.priority, 'Urgent', 'High', 'Medium', 'Low')`,
    };
    const sortColumn = sortableColumns[sortBy] || "t.created_at";
    const order =
      sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const orderByString = `${sortColumn} ${order}`;

    const countSql = `SELECT COUNT(DISTINCT t.task_id) as total FROM tasks t ${joins} WHERE ${whereString}`;

    const dataSql = `
            SELECT DISTINCT t.*
            FROM tasks t
            ${joins}
            WHERE ${whereString}
            ORDER BY ${orderByString}
            LIMIT ? OFFSET ?;
        `;

    const [countResult, dataResult] = await Promise.all([
      req.db.query(countSql, queryValues),
      req.db.query(dataSql, [...queryValues, safeSize, offset]),
    ]);

    const [countRows] = countResult;
    const [tasks] = dataResult;
    const totalItems = countRows[0].total;

    const response = {
      tasks,
      pagination: {
        totalItems: totalItems,
        totalPage: Math.ceil(totalItems / safeSize),
        currentPage: safePage,
        pageSize: safeSize,
      },
    };

    return res.json(req.f.json.success(response));
  } catch (err) {
    console.error("Error fetching tasks: ", err);
    return res.json(req.f.json.error("Failed to fetch tasks."));
  }
};

exports.getSingle = async (req, res) => {
  const { projectId, taskId } = req.params;

  try {
    const taskSql = "SELECT * FROM tasks WHERE task_id = ? AND project_id = ?;";
    const assigneeSql = "SELECT user_id FROM task_assignees WHERE task_id = ?;";

    const [taskResult, assigneeResult] = await Promise.all([
      req.db.query(taskSql, [taskId, projectId]),
      req.db.query(assigneeSql, [taskId]),
    ]);

    const [taskRows] = taskResult;
    const [assigneeRows] = assigneeResult;

    if (taskRows.length === 0)
      return res.json(req.f.json.fail("Task not found in this project."));
    const task = taskRows[0];

    task.assignees = assigneeRows.map((row) => row.user_id);
    return res.json(req.f.json.success(task));
  } catch (err) {
    console.error("Error fetching task", err);
    return res.json(req.f.json.error("Failed to fetch task."));
  }
};

exports.create = async (req, res) => {
  let { projectId } = req.params;
  let project_id = projectId;
  let title = req.body.title;
  let description = req.body.description || null;
  let due_date = req.body.due_date || null;
  let priority = req.body.priority || null;
  let status_id = req.body.status_id;
  let creator_id = req.user_id;
  let parent_task_id = req.body.parent_task_id || null;
  let assigneeIds = req.body.assignee_user_id || null;
  let task_hash = req.f.generate();

  if (!title || !status_id || !creator_id)
    return res.json(req.f.json.fail("Missing required field"));

  await req.db.beginTransaction();
  try {
    if (parent_task_id) {
      const [parentTaskRow] = await req.db.query(
        "SELECT project_id FROM tasks WHERE task_id = ?",
        [parent_task_id],
      );
      if (parentTaskRow.length === 0) {
        await req.db.rollback();
        return res.json(req.f.json.fail("Parent_task not found"));
      }

      if (parentTaskRow[0].project_id.toString() !== project_id.toString()) {
        await req.db.rollback();
        return res.json(
          req.f.json.fail("Parent task must belong to the same project."),
        );
      }
    }

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
                parent_task_id,
                created_at,
                updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`;

    const values = [
      project_id,
      task_hash,
      title,
      description,
      status_id,
      priority,
      creator_id,
      due_date,
      parent_task_id,
    ];

    const [taskRows] = await req.db.query(insertQuery, values);
    const newTaskId = taskRows.insertId;

    // Convert hash strings to user IDs if needed
    let convertedAssigneeIds = assigneeIds;
    if (assigneeIds && assigneeIds.length > 0) {
      convertedAssigneeIds = await Promise.all(
        assigneeIds.map(async (id) => {
          // If it's a string (hash), look up the user_id
          if (typeof id === "string") {
            const [userRows] = await req.db.query(
              "SELECT user_id FROM users WHERE hash = ?",
              [id],
            );
            return userRows.length > 0 ? userRows[0].user_id : null;
          }
          // If it's already an integer, return as-is
          return id;
        }),
      );
      // Filter out any null values (invalid hashes)
      convertedAssigneeIds = convertedAssigneeIds.filter((id) => id !== null);
    }

    if (convertedAssigneeIds && convertedAssigneeIds.length > 0) {
      const assigneeSql =
        "INSERT INTO task_assignees (task_id, user_id) VALUES ?";
      const assigneeValues = convertedAssigneeIds.map((userId) => [
        newTaskId,
        userId,
      ]);

      await req.db.query(assigneeSql, [assigneeValues]);
    }
    await req.db.commit();
    const [newTaskRows] = await req.db.query(
      "SELECT * FROM tasks WHERE task_hash = ?",
      [task_hash],
    );
    return res.json(req.f.json.success(newTaskRows[0]));
  } catch (err) {
    await req.db.rollback();
    console.error("Database error", err);
    return res.json(req.f.json.error("Database error"));
  }
};

exports.update = async (req, res) => {
  let title = req.body.title;
  let description = req.body.description;
  let dueDate = req.body.due_date;
  let priority = req.body.priority;
  let statusIds = req.body.status_id;
  let assigneeIds = req.body.assignee_user_id;
  const { projectId, taskId } = req.params;
  const userId = req.user_id;

  if (Object.keys(req.body).length === 0) {
    return res.json(
      req.f.json.fail("Request body cannot be empty for an update."),
    );
  }

  await req.db.beginTransaction();
  try {
    const [memberRows] = await req.db.query(
      "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
      [userId, projectId],
    );
    const [assigneeRows] = await req.db.query(
      "SELECT user_id FROM task_assignees WHERE task_id = ?",
      [taskId],
    );

    if (memberRows.length === 0) {
      await req.db.rollback();
      return res.json(
        req.f.json.fail(
          403,
          "Access Denied: You are not a member of this project.",
        ),
      );
    }

    const userProjectRole = memberRows[0].role;
    const isAssigned = assigneeRows.some(
      (assignee) => assignee.user_id === userId,
    );

    if (userProjectRole !== "manager" && !isAssigned) {
      await req.db.rollback();
      return res.json(
        req.f.json.fail(
          403,
          "Permission Denied: You must be a project manager or assigned to this task to update it.",
        ),
      );
    }

    const updateFields = [];
    const queryValues = [];

    const addField = (fieldName, value) => {
      if (value !== undefined) {
        updateFields.push(`${fieldName} = ?`);
        queryValues.push(value);
      }
    };

    addField("title", title);
    addField("description", description);
    addField("due_date", dueDate);
    addField("priority", priority);
    addField("status_id", statusIds);

    if (updateFields.length > 0) {
      updateFields.push("updated_at = NOW()");
      const setClause = updateFields.join(", ");
      const updateTaskSql = `UPDATE tasks SET ${setClause} WHERE task_id = ? AND project_id = ?;`;

      await req.db.query(updateTaskSql, [...queryValues, taskId, projectId]);
    }

    if (assigneeIds && Array.isArray(assigneeIds)) {
      await req.db.query("DELETE FROM task_assignees WHERE task_id = ?", [
        taskId,
      ]);

      // Convert hash strings to user IDs if needed
      let convertedAssigneeIds = assigneeIds;
      if (assigneeIds.length > 0) {
        convertedAssigneeIds = await Promise.all(
          assigneeIds.map(async (id) => {
            // If it's a string (hash), look up the user_id
            if (typeof id === "string") {
              const [userRows] = await req.db.query(
                "SELECT user_id FROM users WHERE hash = ?",
                [id],
              );
              return userRows.length > 0 ? userRows[0].user_id : null;
            }
            // If it's already an integer, return as-is
            return id;
          }),
        );
        // Filter out any null values (invalid hashes)
        convertedAssigneeIds = convertedAssigneeIds.filter((id) => id !== null);
      }

      if (convertedAssigneeIds.length > 0) {
        const assigneeSql =
          "INSERT INTO task_assignees (task_id, user_id) VALUES ?";
        const assigneeValues = convertedAssigneeIds.map((id) => [taskId, id]);
        await req.db.query(assigneeSql, [assigneeValues]);
      }
    }

    await req.db.commit();
    const [updatedTaskRows] = await req.db.query(
      "SELECT * FROM tasks WHERE task_id = ?",
      [taskId],
    );
    const [updatedAssigneeRows] = await req.db.query(
      "SELECT user_id FROM task_assignees WHERE task_id = ?",
      [taskId],
    );

    const updatedTask = updatedTaskRows[0];
    updatedTask.assignee = updatedAssigneeRows.map((row) => row.user_id);

    return res.json(req.f.json.success(updatedTask));
  } catch (err) {
    await req.db.rollback();
    console.error("Error updating task", err);
    return res.json(req.f.json.error("Failed to update task."));
  }
};

exports.delete = async (req, res) => {
  const { projectId, taskId } = req.params;

  try {
    await req.db.beginTransaction();

    await req.db.query("DELETE FROM task_assignees WHERE task_id = ?", [
      taskId,
    ]);
    await req.db.query("DELETE FROM comments WHERE task_id = ?", [taskId]);

    const [deleteResult] = await req.db.query(
      "DELETE FROM tasks WHERE task_id = ? AND project_id = ?",
      [taskId, projectId],
    );

    await req.db.commit();
    if (deleteResult.length === 0)
      return res.json(req.f.json.fail("Task not found in this project."));

    return res.json(req.f.json.success("Task Delete Successfully."));
  } catch (err) {
    await req.db.rollback();
    console.error("Database", err);
    return res.json(req.f.json.error("Database Error!"));
  }
};

exports.updateStatus = async (req, res) => {
  const { projectId, taskId } = req.params;
  const userId = req.user_id;
  const { status_id } = req.body;

  if (status_id === undefined || typeof status_id !== "number") {
    return res.json(
      req.f.json.fail("A numeric status ID is required in the request body."),
    );
  }

  try {
    const [memberRows] = await req.db.query(
      "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
      [userId, projectId],
    );
    const [assigneeRows] = await req.db.query(
      "SELECT user_id FROM task_assignees WHERE task_id = ?",
      [taskId],
    );

    if (memberRows.length === 0) {
      return res.json(
        req.f.json.fail(
          403,
          "Access Denied: You are not a member of this project.",
        ),
      );
    }

    const userProjectRole = memberRows[0].role;
    const isAssigned = assigneeRows.some(
      (assignee) => assignee.user_id === userId,
    );

    if (userProjectRole !== "manager" && !isAssigned) {
      return res.json(
        req.f.json.fail(
          "Permission Denied: You must be a project manager or assigned to this task to update its status.",
        ),
      );
    }

    const sql =
      "UPDATE tasks SET status_id = ?, updated_at = NOW() WHERE task_id = ? AND project_id = ?;";
    const [result] = await req.db.query(sql, [status_id, taskId, projectId]);

    if (result.affectedRows === 0) {
      return res.json(req.f.json.fail("Task not found in this project."));
    }

    const [updatedTaskRows] = await req.db.query(
      "SELECT * FROM tasks WHERE task_id = ?",
      [taskId],
    );

    return res.json(req.f.json.success(updatedTaskRows[0]));
  } catch (err) {
    console.error("Error updating status ID", err);
    return res.json(req.f.json.error("Failed to update task status"));
  }
};

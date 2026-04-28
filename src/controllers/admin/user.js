exports.getList = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const offset = (page - 1) * size;
    const { role, email } = req.query;

    const params = [];
    const conditions = [];

    try {
        if (role) {
            if (!['user', 'admin', 'super-admin'].includes(role)) {
                return res.json(req.f.json.fail('Invalid role value'));
            }
            conditions.push('role = ?');
            params.push(role);
        }

        if (email) {
            conditions.push('email LIKE ?');
            params.push(`%${email}%`);
        }

        let whereClause = '';
        if (conditions.length > 0) {
            whereClause = ' WHERE ' + conditions.join(' AND ');
        }

        const sql = `
            SELECT
                hash,
                full_name,
                email,
                COUNT(*) OVER() AS total
            FROM users
            ${whereClause}
            ORDER BY user_id ASC
            LIMIT ? OFFSET ?
        `;

        const finalParams = [...params, size, offset];
        const [result] = await req.db.query(sql, finalParams);

        const totalRow = result.length > 0 ? result[0].total : 0;
        const lastPage = Math.ceil(totalRow / size);

        const dataItems = result.map(row => {
            const { total, ...rest } = row;
            return rest
        });

        return res.json({
            status: 'success',
            data: {
                data_items: dataItems,
                total: totalRow,
                current_page: page,
                last_page: lastPage,
                per_page: size,
            }
        });
    } catch (err) {
        console.error('database error:', err);
        return res.json(req.f.json.fail('Database error!'));
    }
}

exports.getSingle = async (req, res) => {
    const { hash } = req.params;
    const sql = `
    SELECT
        user_id,
        hash,
        single_id,
        full_name,
        email,
        user_role
    FROM users
    WHERE hash = ? LIMIT 1`;

    try {
        const [rows] = await req.db.query(sql, [hash]);
        if(rows.length === 0) return res.json(req.f.json.fail('User not found'));

        const newUser = rows[0];
        return res.json(req.f.json.success(newUser));
    } catch (err) {
        console.log('Database Error', err);
        return res.json(req.f.json.fail('Database Error'));
    }
}

exports.create = async (req, res) => {
    const { single_id, email, full_name, user_role } = req.body;
    const admin_id = req.user?.user_id || null;

    if (!single_id || !email || !full_name || !user_role) {
        return res.json(req.f.json.fail('Missing required field.'));
    }

    try {
        const [existing] = await req.db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.json(req.f.json.fail('Email already exists'));
        }

        let hash;
        let isUnique = false;

        while (!isUnique) {
            hash = req.f.generate();
            const [rows] = await req.db.query('SELECT hash FROM users WHERE hash = ?', [hash]);
            if (rows.length === 0) isUnique = true;
        }
        const hash_login = req.f.generate("", 32);

        const insertSql = `
            INSERT INTO users (hash, hash_login, single_id, email, full_name, user_role)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await req.db.query(insertSql, [
            hash,
            hash_login,
            single_id,
            email,
            full_name,
            user_role
        ]);
        const inserted_user_id = result.insertId;
        if (typeof req.f.logActivity === 'function') {
            try {
                await new Promise((resolve, reject) => {
                    req.f.logActivity(admin_id, null, null, `User ${full_name} created`, 'CREATE', err => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } catch (logErr) {
                console.error('Log Activity Error:', logErr);
                return res.json(req.f.json.error('Internal Server Error'));
            }
        }

        return res.json(req.f.json.success({
            user_id: inserted_user_id,
            hash,
            hash_login,
            message: 'User created successfully!'
        }));

    } catch (err) {
        console.error('Create User Error:', err);
        return res.json(req.f.json.error('Internal Server Error'));
    }
};

exports.update = async (req, res) => {
    const { hash } = req.params;
    const { full_name, email, role } = req.body;

    if (role && !['user', 'admin', 'super-admin'].includes(role)) {
        return res.json(req.f.json.fail('Invalid role value'))
    }

    try {
        const [rows] = await req.db.query('SELECT * FROM users WHERE hash = ? LIMIT 1', [hash]);
        if (!rows || rows.length === 0) return res.json(req.f.json.fail('User not found'));

        const updates = [];
        const params = [];

        if (full_name) {
            updates.push('full_name = ?');
            params.push(full_name);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (role) {
            updates.push('user_role = ?');
            params.push(role);
        }

        if (updates.length === 0) return res.json(req.f.json.fail('No field to update'));

        params.push(hash);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE hash = ?`;
        await req.db.query(sql, params);

        return res.json(req.f.json.success('Update successfully'));
    } catch (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ status: 'fail', message: 'Internal server error' });
    }
};

exports.delete = async (req, res) => {
    const { hash } = req.params;

    if (!hash) return res.json(req.f.json.fail('User hash is required'));

    try {
        const [rows] = await req.db.query('SELECT * FROM users WHERE hash = ? LIMIT 1', [hash]);

        if (!rows || rows.length === 0) return res.json(req.f.json.fail('User not found'));

        await req.db.query('DELETE FROM users WHERE hash = ?', [hash]);

        return res.json(req.f.json.success('User delete successfully'));
    } catch (err) {
        console.error('Database Error:', err);
        return res.json(req.f.json.fail('Database Error'));
    }
}
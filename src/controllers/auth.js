const axios = require('axios');

const toUser = (row) => ({
    id: row.user_id,
    hash: row.hash,
    name: row.full_name,
    email: row.email,
    role: row.user_role,
    avatar: (row.full_name || row.email || 'U').slice(0, 2).toUpperCase(),
});

const signUserToken = (req, user) => {
    const signed = req.f.jwt.sign(
        { hash: user.hash, hash_login: user.hash_login },
        req.setting.jwt_private,
        req.setting.session_duration,
    );
    return signed.token;
};

exports.login = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json(req.f.json.fail(400, 'Email is required.'));

    try {
        const [rows] = await req.db.query(
            'SELECT user_id, hash, full_name, email, user_role, hash_login FROM users WHERE email = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0) return res.json(req.f.json.fail(404, 'User not found. Please register first.'));
        const user = rows[0];
        return res.json(req.f.json.success({ token: signUserToken(req, user), user: toUser(user) }));
    } catch (error) {
        console.error('Login error:', error);
        return res.json(req.f.json.error('Login failed.'));
    }
};

exports.register = async (req, res) => {
    const { name, full_name, email } = req.body;
    const userName = full_name || name;
    if (!userName || !email) return res.json(req.f.json.fail(400, 'Name and email are required.'));

    try {
        const [existing] = await req.db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
        if (existing.length > 0) return res.json(req.f.json.fail(409, 'Email already exists.'));

        const hash = req.f.generate();
        const hash_login = req.f.generate('', 32);
        const [result] = await req.db.query(
            `INSERT INTO users (hash, single_id, full_name, email, user_role, hash_login)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [hash, 1, userName, email, 'admin', hash_login]
        );

        const user = { user_id: result.insertId, hash, full_name: userName, email, user_role: 'admin', hash_login };
        return res.json(req.f.json.success({ token: signUserToken(req, user), user: toUser(user) }));
    } catch (error) {
        console.error('Register error:', error);
        return res.json(req.f.json.error('Registration failed.'));
    }
};

exports.me = async (req, res) => {
    return res.json(req.f.json.success({
        id: req.user_id,
        hash: req.hash,
        name: req.full_name,
        role: req.user_role,
        avatar: (req.full_name || 'U').slice(0, 2).toUpperCase(),
    }));
};

exports.get_login = async (req, res) => {
    try {
        if (Number(process.env.DEV) == 1) {
            console.log(req.f.jwt.sign({ hash: '23j4g3g452g54', hash_login: '123' }, req.setting.jwt_private, req.setting.session_duration))
        }

        const response = await axios.post(
            `${req.setting.single_id_endpoint}/get_login`,
            { api_key: req.setting.single_id_api_key },
            { timeout: 5000 },
        );
        if (response.data.status != 'success') return res.json(req.f.json.fail(400, 'single_id connection failed'));
        return res.json(req.f.json.success({ login_token: response.data.data.login_token, redirect_url: response.data.data.login_url }));
    } catch (error) {
        return res.json(req.f.json.fail(400, 'Cannot connect to single_id'));
    }
}

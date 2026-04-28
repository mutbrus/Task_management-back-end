module.exports = async (req, res, next) => {
    if (!req.headers.authorization) return res.json(req.f.json.fail(400, "access_denied"));
    const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
    const decodedToken = req.f.jwt.verify(token, req.setting.jwt_private);
    if (!decodedToken.success) return res.json(req.f.json.expired(res));

    const hash = decodedToken.data.hash;
    const hash_login = decodedToken.data.hash_login;
    
    try {
        const [rows] = await req.db.query(
            "SELECT user_id, hash, single_id, full_name, hash_login, user_role FROM users WHERE hash = ?", [hash]
        );
        
        if (rows.length !== 1 || hash_login !== rows[0].hash_login) return res.json(req.f.json.expired(res));

        req.user_id = rows[0].user_id;
        req.hash = rows[0].hash;
        req.single_id = rows[0].single_id;
        req.full_name = rows[0].full_name;
        req.user_role = rows[0].user_role;

        next();
    } catch (err) {
        return res.json(req.f.json.error(err));
    }
}

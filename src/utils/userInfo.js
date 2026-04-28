const { db } = require('../configs/db');
const { Hash } = require('../functions/common')

exports.findOrCreateUser = (userInfo) => {
    return new Promise((resolve, reject) => {
        const misti_single_id = userInfo.misti_single_id || userInfo.sub;

        if (!misti_single_id) return reject(new Error('User not found'));

        db.query('SELECT user_id, role FROM users WHERE misti_single_id = ?', [misti_single_id], (err, rows) => {
            if (err) return reject(err);

            if (rows.length > 0) return resolve({ user_id: rows[0].user_id, misti_single_id, role: rows[0].role });

            const user_hash = Hash.generate('user');
            const email = userInfo.email || `${misti_single_id}@example.com`;
            const full_name = userInfo.name || 'Unknown User';
            const role = 'user';

            const sql = `INSERT INTO users (user_hash, misti_single_id, email, full_name, role) VALUES (?,?,?,?,?)`;
            db.query(sql, [user_hash, misti_single_id, email, full_name, role], (err, result) => {
                if (err) return reject(err);
                resolve({ user_id: result.insertId, misti_single_id, role });
            })
        })
    })
}
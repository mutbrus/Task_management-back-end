const mysql = require("mysql2/promise");
const onFinished = require("on-finished");

const pool = mysql.createPool({
    connectionLimit: 20,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    namedPlaceholders: true,
    timezone: "Z"
});

exports.db = async (req, res, next) => {
    let connection;
    try {
        connection = await pool.getConnection();
        req.db = connection;

        onFinished(res, () => {
            if (connection) connection.release();
        })
        
        let setting = res.cache?.get("setting");
        if (!setting) {
            const [rows] = await connection.query("SELECT * FROM setting");
            setting = {};
            for (const row of rows) {
                setting[row.set_name] = row.setting_value;
            }
            res.cache?.set("setting", setting, 30);
        }
        req.setting = setting;

        return next();
    } catch (err) {
        console.error("DB Middleware Error:", err.stack || err);

        if (connection) connection.release();
        if (!res.headersSent) {
            res.status(500).json({ error: "Database connection error" });
        }
    }
};

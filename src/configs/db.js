const mysql = require('mysql2');

// let db = {};
// try {
//     db = mysql.createPool({
//         host: process.env.DB_HOST,
//         port: process.env.DB_PORT,
//         database: process.env.DB_DATABASE,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASSWORD,
//         connectionLimit: 10,
//         waitForConnections: true,
//         queueLimit: 0,
//         multipleStatements: true,
//         charset: 'utf8mb4',
//     });
// } catch (error) {
//     console.log('Error connecting to the database:' + JSON.stringify(error));
// }

// module.exports = db;
// const db = require('./db');

// exports.loadSettings = () => {
//     return new Promise((resolve, reject) => {
//         db.query("SELECT set_name, setting_value FROM setting", (err, rows) => {
//             if (err) return reject(err);
//             const settings = {};
//             rows.forEach(row => {
//                 settings[row.set_name] = row.setting_value;
//             });
//             resolve(settings);
//         });
//     });
// };

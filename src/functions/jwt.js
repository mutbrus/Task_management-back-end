const jwt = require('jsonwebtoken');
const { success } = require('./json');

exports.verify = (token, secret) => {
    try {
        const decoded = jwt.verify(token, secret);
        return { status: 'success', success: true, data: decoded.data };
    } catch (err) {
        return { status: 'fail', error: err.message };
    }
}

exports.sign = (data, secret, expiresIn = '1h') => {
    try {
        const token = jwt.sign({ data }, secret, { expiresIn });
        return { status: 'success', success: true, token };
    } catch (err) {
        return { status: 'fail', error: err.message };
    }
}
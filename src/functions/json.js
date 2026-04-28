exports.error = (msg, setting) => {
    let error = String(JSON.stringify(msg));
    console.log(error);
    return { status: "error", statusCode: 500, messageCode: 500, message: "Internal Server Error"};
}

exports.fail = (code = 400, message) => {
    let response = { status: "fail", statusCode: 400, messageCode: code, message: message, error: ""};
    console.log(JSON.stringify(response));
    return response;
}

exports.success = (data) => {
    let response = { status: "success", statusCode: 200, message: "OK", messageCode: 200, data: data };
    console.log(JSON.stringify(response));
    return response;
}

exports.expired = () => {
    let response = { status: "expired", messageCode: 410, message: "Your access is expired."};
    console.log(JSON.stringify(response));
    return response;
}
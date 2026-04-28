exports.error500 = (err, req, res, next) => {
    console.log(err)
    if (String(err).indexOf("cors") !== -1) return res.status(200).json(req.f.json.fail(403, "Access Not Permission."));
    if (!req.setting) return res.status(500).json({ status: "error", statusCode: 500, message: "Internal Server Error" });
    return res.status(500).json(req.f.json.fail(err.stack, req.setting));
}

exports.error404 = (req, res) => {
    return res.status(200).json(req.f.json.fail(404, "Access Not Found."));
}

exports.errorLimit = (req, res) => {
    return res.status(200).json(req.f.json.fail(429, "Access Limit Exceeded."));
}
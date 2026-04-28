exports.getIP = headers => {
    let forward = String(headers['x-forwarded-for']).split(",");

    if (forward.length > 1) {
        return forward[0];
    } else if (String(headers['cf-connecting-ip']) != 'undefined') {
        return headers['cf-connecting-ip'];
    } else {
        return "Unknown IP."
    }
}

exports.replaceKhmerNumber = string => {
    return String(string)
        .replace("១", "1")
        .replace("២", "2")
        .replace("៣", "3")
        .replace("៤", "4")
        .replace("៥", "5")
        .replace("៦", "6")
        .replace("៧", "7")
        .replace("៨", "8")
        .replace("៩", "9")
        .replace("០", "0");
}

exports.generate = (prefix = "", length = 12) => {
    let allowedString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let generated = ""
    for (let i = 0; i < parseInt(length); i++) {
        let random = Math.floor(Math.random() * allowedString.length)
        generated += allowedString[random]
    }
    return prefix ? `${prefix}-${generated}` : generated;
}

exports.getTime = () => {
    let date = new Date()
    return date.getTime()
}

exports.stringify = data => {
    if (typeof data === "object") {
        return JSON.stringify(data)
    }
}

exports.parse = data => {
    if (typeof data === "string") {
        try {
            let parsed = JSON.parse(data)
            return parsed
        } catch (Exception) {
            return { error: Exception.message }
        }
    } else {
        return { error: "Invalid data." }
    }
}
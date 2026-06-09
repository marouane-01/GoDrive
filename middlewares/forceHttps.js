const { shouldForceHttps } = require('../config/appConfig');

function forceHttps(req, res, next) {
    if (!shouldForceHttps()) {
        return next();
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
        .split(',')[0]
        .trim()
        .toLowerCase();

    if (forwardedProto && forwardedProto !== 'https') {
        const host = req.headers.host || req.hostname;
        return res.redirect(301, `https://${host}${req.originalUrl}`);
    }

    return next();
}

module.exports = forceHttps;

const { isProduction } = require('../config/appConfig');

const GENERIC_500 = 'Internal server error';
const GENERIC_413 = 'Request entity too large';

function resolveStatus(err) {
    if (err.statusCode && Number.isFinite(err.statusCode)) {
        return err.statusCode;
    }
    if (err.status && Number.isFinite(err.status)) {
        return err.status;
    }
    if (err.type === 'entity.too.large') {
        return 413;
    }
    return 500;
}

function resolveClientMessage(err, status) {
    const isProd = isProduction();
    const isServerError = status >= 500;

    if (isProd && isServerError) {
        return status === 413 ? GENERIC_413 : GENERIC_500;
    }

    if (status === 413) {
        return GENERIC_413;
    }

    return err.message || 'Server Error';
}

exports.errorHandler = (err, req, res, _next) => {
    const status = resolveStatus(err);

    if (err && typeof err === 'object' && err.stack) {
        console.error(`[error] ${req.method} ${req.originalUrl || req.url} (${status})`, err.stack);
    } else {
        console.error(`[error] ${req.method} ${req.originalUrl || req.url} (${status})`, err);
    }

    res.status(status).json({
        success: false,
        error: resolveClientMessage(err, status),
    });
};

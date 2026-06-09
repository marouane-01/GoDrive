function parseAllowedOrigins() {
    const raw = String(process.env.CORS_ALLOWED_ORIGINS || '').trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const { isProduction } = require('../config/appConfig');

function buildCorsOptions() {
    const allowedOrigins = parseAllowedOrigins();
    const isProd = isProduction();

    if (isProd && allowedOrigins.length === 0) {
        console.warn(
            '[cors] CORS_ALLOWED_ORIGINS is not set in production — cross-origin API requests will be blocked.'
        );
    }

    return {
        origin(origin, callback) {
            // Same-origin / server-to-server / curl (no Origin header)
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    };
}

module.exports = {
    parseAllowedOrigins,
    buildCorsOptions,
};

const { isProduction, shouldForceHttps } = require('./appConfig');
const { isJwtSecretConfigured, MIN_JWT_SECRET_LENGTH } = require('../utils/jwtSecret');
const { parseAllowedOrigins } = require('../utils/corsConfig');

function getSmtpVars() {
    return {
        host: String(process.env.CONTACT_SMTP_HOST || process.env.SMTP_HOST || '').trim(),
        user: String(process.env.CONTACT_SMTP_USER || process.env.SMTP_USER || '').trim(),
        pass: String(process.env.CONTACT_SMTP_PASS || process.env.SMTP_PASS || '').trim(),
        mailTo: String(process.env.CONTACT_MAIL_TO || '').trim(),
    };
}

function isEtherealStagingAllowed() {
    return ['true', '1', 'yes'].includes(String(process.env.CONTACT_USE_ETHEREAL || '').toLowerCase());
}

function validatePublicBaseUrl() {
    const raw = String(process.env.PUBLIC_BASE_URL || '').trim();
    if (!raw) {
        return 'PUBLIC_BASE_URL is required';
    }

    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        return 'PUBLIC_BASE_URL must be a valid URL';
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'PUBLIC_BASE_URL must use http or https';
    }

    if (isProduction() && parsed.protocol !== 'https:' && shouldForceHttps()) {
        return 'PUBLIC_BASE_URL must use https in production (set FORCE_HTTPS=false only for local staging)';
    }

    if (parsed.pathname && parsed.pathname !== '/') {
        return 'PUBLIC_BASE_URL must not include a path';
    }

    return null;
}

function validateCorsOrigins() {
    const origins = parseAllowedOrigins();
    if (origins.length === 0) {
        return 'CORS_ALLOWED_ORIGINS must list at least one origin (comma-separated)';
    }

    for (const origin of origins) {
        try {
            const url = new URL(origin);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return `CORS_ALLOWED_ORIGINS entry must be an http/https URL: ${origin}`;
            }
        } catch {
            return `CORS_ALLOWED_ORIGINS contains invalid URL: ${origin}`;
        }
    }

    return null;
}

function validateSmtp() {
    if (isEtherealStagingAllowed()) {
        return null;
    }

    const { host, user, pass, mailTo } = getSmtpVars();
    const missing = [];
    if (!host) missing.push('CONTACT_SMTP_HOST');
    if (!user) missing.push('CONTACT_SMTP_USER');
    if (!pass) missing.push('CONTACT_SMTP_PASS');
    if (!mailTo) missing.push('CONTACT_MAIL_TO');

    if (missing.length) {
        return `SMTP not configured: set ${missing.join(', ')} (or CONTACT_USE_ETHEREAL=true for staging only)`;
    }

    return null;
}

function collectProductionErrors() {
    const errors = [];

    if (!isJwtSecretConfigured()) {
        errors.push(
            `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} cryptographically random characters`
        );
    }

    const publicBaseUrlError = validatePublicBaseUrl();
    if (publicBaseUrlError) errors.push(publicBaseUrlError);

    const corsError = validateCorsOrigins();
    if (corsError) errors.push(corsError);

    const smtpError = validateSmtp();
    if (smtpError) errors.push(smtpError);

    return errors;
}

function collectDevelopmentWarnings() {
    const warnings = [];

    if (!isJwtSecretConfigured()) {
        warnings.push(
            `JWT_SECRET is missing or weak (min ${MIN_JWT_SECRET_LENGTH} chars) — auth routes will return 503`
        );
    }

    if (!String(process.env.PUBLIC_BASE_URL || '').trim()) {
        warnings.push('PUBLIC_BASE_URL not set — using localhost default for QR codes');
    }

    if (parseAllowedOrigins().length === 0) {
        warnings.push('CORS_ALLOWED_ORIGINS not set — localhost origins allowed in development');
    }

    const smtp = getSmtpVars();
    if (!smtp.host && !isEtherealStagingAllowed()) {
        warnings.push('CONTACT_SMTP_* not set — contact form will use Ethereal test mail in development');
    }

    return warnings;
}

function validateStartupConfig() {
    if (isProduction()) {
        const errors = collectProductionErrors();
        if (errors.length) {
            console.error('[config] Cannot start: production configuration is invalid');
            errors.forEach((err) => console.error(`  - ${err}`));
            process.exit(1);
        }

        if (isEtherealStagingAllowed()) {
            console.warn('[config] CONTACT_USE_ETHEREAL=true — using test mail in production (staging only)');
        }

        console.log('[config] Production configuration validated');
        return;
    }

    collectDevelopmentWarnings().forEach((warning) => console.warn(`[config] ${warning}`));
}

module.exports = {
    validateStartupConfig,
    collectProductionErrors,
    collectDevelopmentWarnings,
    getSmtpVars,
};

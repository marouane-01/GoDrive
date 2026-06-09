const MIN_JWT_SECRET_LENGTH = 32;

const WEAK_SECRET_PATTERNS = [
    /^change_me/i,
    /^super_secret/i,
    /^your[_-]?secret/i,
    /^password\d*$/i,
    /^secret\d*$/i,
];

function getJwtSecret() {
    const secret = String(process.env.JWT_SECRET || '').trim();
    if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
        return null;
    }

    if (WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(secret))) {
        return null;
    }

    return secret;
}

function isJwtSecretConfigured() {
    return getJwtSecret() !== null;
}

module.exports = {
    MIN_JWT_SECRET_LENGTH,
    getJwtSecret,
    isJwtSecretConfigured,
};

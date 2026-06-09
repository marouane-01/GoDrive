const jwt = require('jsonwebtoken');
const { getJwtSecret, MIN_JWT_SECRET_LENGTH } = require('./jwtSecret');
const { isAllowedRole } = require('./roles');

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN = '30d';

const verifyOptions = {
    algorithms: [JWT_ALGORITHM],
};

const signOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
};

function validateTokenPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const id = Number(payload.id);
    const role = String(payload.role || '').trim().toLowerCase();

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    if (!isAllowedRole(role)) {
        return null;
    }

    return { id, role };
}

function signAccessToken(user) {
    const secret = getJwtSecret();
    if (!secret) {
        throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }

    return jwt.sign({ id: user.id, role: user.role }, secret, signOptions);
}

function verifyAccessToken(token) {
    const secret = getJwtSecret();
    if (!secret) {
        throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }

    const decoded = jwt.verify(token, secret, verifyOptions);
    const payload = validateTokenPayload(decoded);

    if (!payload) {
        throw new jwt.JsonWebTokenError('Invalid token payload');
    }

    return payload;
}

module.exports = {
    JWT_ALGORITHM,
    JWT_EXPIRES_IN,
    MIN_JWT_SECRET_LENGTH,
    signAccessToken,
    verifyAccessToken,
    validateTokenPayload,
};

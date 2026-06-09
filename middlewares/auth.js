const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyAccessToken } = require('../utils/jwt');
const { getJwtSecret, MIN_JWT_SECRET_LENGTH } = require('../utils/jwtSecret');
const { isAllowedRole } = require('../utils/roles');

exports.protect = async (req, res, next) => {
    const header = req.headers.authorization;
    let token;
    if (header && header.startsWith('Bearer ')) {
        token = header.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    if (!getJwtSecret()) {
        console.error(`[auth] JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters`);
        return res.status(503).json({ error: 'Server authentication is not configured' });
    }

    try {
        const decoded = verifyAccessToken(token);

        const userResult = await db.query('SELECT id, role FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Not authorized, user not found' });
        }

        const dbUser = userResult.rows[0];
        if (!isAllowedRole(dbUser.role)) {
            return res.status(403).json({ error: 'User role is not permitted' });
        }

        if (dbUser.role !== decoded.role) {
            return res.status(401).json({ error: 'Not authorized, token is no longer valid' });
        }

        req.user = { id: dbUser.id, role: dbUser.role };
        next();
    } catch (error) {
        if (error.message === 'JWT_SECRET_NOT_CONFIGURED') {
            console.error(`[auth] JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters`);
            return res.status(503).json({ error: 'Server authentication is not configured' });
        }

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Not authorized, token expired' });
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }

        return next(error);
    }
};

exports.authorize = (...roles) => {
    const allowed = roles.map((role) => String(role).trim().toLowerCase());

    return (req, res, next) => {
        if (!req.user || !isAllowedRole(req.user.role)) {
            return res.status(403).json({ error: 'User role not authorized' });
        }

        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ error: 'User role not authorized' });
        }

        next();
    };
};

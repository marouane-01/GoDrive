const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    const header = req.headers.authorization;
    let token;
    if (header && header.startsWith('Bearer ')) {
        token = header.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || String(secret).length < 8) {
        console.error('[auth] JWT_SECRET is missing or too short');
        return res.status(503).json({ error: 'Server authentication is not configured' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'User role not authorized' });
        }
        next();
    };
};
const bcrypt = require('bcrypt');
const db = require('../config/db');
const Joi = require('joi');
const { signAccessToken } = require('../utils/jwt');
const { getJwtSecret, MIN_JWT_SECRET_LENGTH } = require('../utils/jwtSecret');
const { ROLES, isAllowedRole } = require('../utils/roles');

const loginSchema = Joi.object({
    email: Joi.string().trim().email().max(254).required(),
    password: Joi.string().min(1).max(128).required(),
});

exports.login = async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body || {}, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return res.status(400).json({
                error: 'Invalid credentials',
                details: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
            });
        }

        if (!getJwtSecret()) {
            console.error(`[auth] JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters`);
            return res.status(503).json({ error: 'Server authentication is not configured' });
        }

        const { email, password } = value;

        const user = await db.query('SELECT id, name, email, password, role FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const account = user.rows[0];

        if (!isAllowedRole(account.role)) {
            console.error(`[auth] User ${account.id} has unsupported role "${account.role}"`);
            return res.status(403).json({ error: 'Account is not permitted to sign in' });
        }

        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signAccessToken({ id: account.id, role: account.role });

        res.status(200).json({
            success: true,
            token,
            user: { id: account.id, name: account.name, role: account.role },
        });
    } catch (err) {
        if (err.message === 'JWT_SECRET_NOT_CONFIGURED') {
            console.error(`[auth] JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters`);
            return res.status(503).json({ error: 'Server authentication is not configured' });
        }
        next(err);
    }
};

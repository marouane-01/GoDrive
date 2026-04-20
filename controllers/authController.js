const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('client', 'driver').required()
});

exports.register = async (req, res, next) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { name, email, password, role } = req.body;

        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        );

        res.status(201).json({ success: true, data: newUser.rows[0] });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret || String(secret).length < 8) {
            console.error('[auth] JWT_SECRET is missing or too short');
            return res.status(503).json({ error: 'Server authentication is not configured' });
        }

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            secret,
            { expiresIn: '30d' }
        );

        res.status(200).json({ success: true, token, user: { id: user.rows[0].id, name: user.rows[0].name, role: user.rows[0].role } });
    } catch (err) {
        next(err);
    }
};
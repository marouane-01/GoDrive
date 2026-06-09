const express = require('express');
const rateLimit = require('express-rate-limit');
const { login } = require('../controllers/authController');
const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Please try again later.' },
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please try again later.' },
});

router.post('/register', registerLimiter, (req, res) => {
    res.status(403).json({
        success: false,
        error: 'Les inscriptions en ligne sont désactivées. Téléchargez l’application.',
    });
});
router.post('/login', loginLimiter, login);

module.exports = router;

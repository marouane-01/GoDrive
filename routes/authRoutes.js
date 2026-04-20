const express = require('express');
const { login } = require('../controllers/authController');
const router = express.Router();

router.post('/register', (req, res) => {
    res.status(403).json({
        success: false,
        error: 'Les inscriptions en ligne sont désactivées. Téléchargez l’application.',
    });
});
router.post('/login', login);

module.exports = router;
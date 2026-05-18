require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const { sendSupportEmail } = require('./services/mailer');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

const isProd = process.env.NODE_ENV === 'production';
// Security Middlewares — CSP : scripts externes (QR jsdelivr) + pas de script inline (fichiers dans public/js/)

// Security Middlewares — CSP : scripts externes (QR jsdelivr) + pas de script inline (fichiers dans public/js/)
app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
                'img-src': ["'self'", 'data:', 'https:', 'blob:'],
            },
        },
    })
);
app.use(cors());

// Rate Limiting — applied ONLY to /api routes (not static assets / HTML pages),
// otherwise a single page load (CSS + JS + images) eats the quota in seconds.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // generous limit for API calls per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/contact', contactRoutes);

const supportBodySchema = Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    email: Joi.string().trim().email().max(254).required(),
    subject: Joi.string().trim().min(1).max(200).required(),
    message: Joi.string().trim().min(1).max(10000).required(),
});

app.post('/api/support', async (req, res) => {
    try {
        const { error, value } = supportBodySchema.validate(req.body || {}, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details.map((d) => ({
                    field: d.path.join('.') || 'body',
                    message: d.message,
                })),
            });
        }

        const info = await sendSupportEmail(value);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('[support] Ethereal preview URL:', previewUrl || '(none)');

        return res.status(200).json({
            success: true,
            message: 'Support message sent (Ethereal). See server log for preview URL.',
            previewUrl: previewUrl || null,
        });
    } catch (err) {
        console.error('[support]', err);
        return res.status(500).json({
            success: false,
            error: 'Could not send support message',
        });
    }
});

// Static Files — en dev : pas de cache agressif pour voir les changements sans Ctrl+F5
app.use(
    express.static(path.join(__dirname, 'public'), {
        maxAge: isProd ? 86400000 : 0,
        etag: isProd,
        lastModified: isProd,
        setHeaders: (res, filePath) => {
            if (!isProd && /\.(html|css|js)$/i.test(filePath)) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            }
        },
    })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
require('dotenv').config();
const { validateStartupConfig } = require('./config/validateConfig');
validateStartupConfig();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const { sendSupportEmail } = require('./services/mailer');
const { buildCorsOptions } = require('./utils/corsConfig');
const {
    getPort,
    isProduction,
    shouldTrustProxy,
    getTrustProxyHops,
    shouldForceHttps,
} = require('./config/appConfig');
const forceHttps = require('./middlewares/forceHttps');
const htmlSeoMiddleware = require('./middlewares/htmlSeoMiddleware');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const healthRoutes = require('./routes/healthRoutes');
const seoRoutes = require('./routes/seoRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
const isProd = isProduction();

if (shouldTrustProxy()) {
    app.set('trust proxy', getTrustProxyHops());
}

app.use(forceHttps);

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
                'style-src': ["'self'", 'https://fonts.googleapis.com'],
                'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
                'img-src': ["'self'", 'data:', 'https:', 'blob:'],
            },
        },
        hsts: shouldForceHttps()
            ? {
                  maxAge: 31536000,
                  includeSubDomains: true,
                  preload: true,
              }
            : false,
    })
);
app.use(cors(buildCorsOptions()));

app.use('/health', healthRoutes);
app.use(seoRoutes);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

const BODY_LIMIT = '100kb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

app.use('/api/contact', contactRoutes);

const supportEnabled =
    !isProd && ['true', '1', 'yes'].includes(String(process.env.ENABLE_SUPPORT_API || '').toLowerCase());

if (supportEnabled) {
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
            });
        } catch (err) {
            console.error('[support]', err);
            return res.status(500).json({
                success: false,
                error: 'Could not send support message',
            });
        }
    });
}

app.use(htmlSeoMiddleware);

app.use(
    express.static(path.join(__dirname, 'public'), {
        index: false,
        maxAge: isProd ? 86400000 : 0,
        etag: isProd,
        lastModified: isProd,
        setHeaders: (res, filePath) => {
            if (isProd && /\.(min\.css|min\.js|json|png|jpg|webp|woff2?)$/i.test(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else if (!isProd && /\.(html|css|js)$/i.test(filePath)) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            }
        },
    })
);

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

const PORT = getPort();
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (isProd) {
        console.log(`Production mode enabled (trust proxy: ${shouldTrustProxy()}, force HTTPS: ${shouldForceHttps()})`);
    }
});

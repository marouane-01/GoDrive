const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { sendContactEmail, isMailConfigured, buildFullPhone } = require('../services/contactEmailService');

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: MAX_FILES },
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.CONTACT_RATE_MAX_PER_HOUR || 15),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMIT', message: 'Too many submissions from this address. Try again later.' },
    handler: (req, res, _next, options) => {
        res.status(429).json(typeof options.message === 'object' ? options.message : { success: false, code: 'RATE_LIMIT', message: String(options.message) });
    },
});

const bodySchema = Joi.object({
    subject: Joi.string().trim().min(2).max(200).required(),
    name: Joi.string().trim().min(2).max(120).required(),
    country: Joi.string().valid('MA', 'FR', 'BE', 'CH', 'CA', 'OTHER').required(),
    response_language: Joi.string().valid('fr', 'ar', 'en').required(),
    service: Joi.string().valid('colis', 'bagages', 'compte', 'partenariat', 'autre').required(),
    phone_prefix: Joi.string().pattern(/^[A-Z]{2}\|\d{1,5}$/).required(),
    phone_local: Joi.string().trim().required(),
    email: Joi.string().email({ tlds: { allow: false } }).max(254).required(),
    comment: Joi.string().trim().min(10).max(5000).required(),
});

function digitsLen(s) {
    return String(s).replace(/\D/g, '').length;
}

const router = express.Router();

router.post(
    '/',
    contactLimiter,
    (req, res, next) => {
        upload.array('files', MAX_FILES)(req, res, (err) => {
            if (!err) return next();
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        code: 'FILE_TOO_LARGE',
                        message: 'Each file must be at most 10 MB.',
                    });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        code: 'FILE_REJECTED',
                        message: 'One or more files have an unsupported type or too many files were sent.',
                    });
                }
            }
            return next(err);
        });
    },
    async (req, res, next) => {
        try {
            if (!isMailConfigured()) {
                return res.status(503).json({
                    success: false,
                    code: 'MAIL_CONFIG',
                    message:
                        'Le serveur e-mail n’est pas configuré. Définissez CONTACT_SMTP_HOST, CONTACT_SMTP_USER et CONTACT_SMTP_PASS dans les variables d’environnement.',
                });
            }

            const honeypot = req.body?.website;
            if (honeypot != null && String(honeypot).trim() !== '') {
                return res.status(400).json({
                    success: false,
                    code: 'SPAM',
                    message: 'Invalid submission.',
                });
            }

            const phoneLocal = String(req.body?.phone_local || '').trim();
            if (digitsLen(phoneLocal) < 6 || digitsLen(phoneLocal) > 18) {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION',
                    message: 'Please enter a valid phone number (local part).',
                    details: [{ path: 'phone_local', message: 'Invalid phone length' }],
                });
            }

            const { error, value } = bodySchema.validate(
                {
                    subject: req.body?.subject,
                    name: req.body?.name,
                    country: req.body?.country,
                    response_language: req.body?.response_language,
                    service: req.body?.service,
                    phone_prefix: req.body?.phone_prefix,
                    phone_local: phoneLocal,
                    email: req.body?.email,
                    comment: req.body?.comment,
                },
                { abortEarly: false, stripUnknown: true }
            );

            if (error) {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION',
                    message: 'Some fields are invalid or missing.',
                    details: error.details.map((d) => ({ path: d.path.join('.'), message: d.message })),
                });
            }

            const fullPhone = buildFullPhone(value.phone_prefix, value.phone_local);
            const files = req.files || [];
            for (const f of files) {
                if (!ALLOWED_MIMES.has(f.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        code: 'FILE_TYPE',
                        message: 'Unsupported file type. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX.',
                    });
                }
            }

            await sendContactEmail({ ...value, fullPhone }, files);

            return res.status(200).json({
                success: true,
                message: 'Your message has been sent.',
            });
        } catch (e) {
            if (e.code === 'MAIL_CONFIG') {
                return res.status(e.statusCode || 503).json({
                    success: false,
                    code: e.code,
                    message: e.message,
                });
            }
            console.error('[contact]', e);
            return res.status(500).json({
                success: false,
                code: 'MAIL_SEND',
                message: 'The message could not be sent. Please try again later.',
            });
        }
    }
);

module.exports = router;

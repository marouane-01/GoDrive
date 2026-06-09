const nodemailer = require('nodemailer');
const { getEtherealBundle } = require('./mailer');
const { validateContactUploads } = require('../utils/contactUploadValidation');

function getContactMailToOrThrow() {
    const to = String(process.env.CONTACT_MAIL_TO || '').trim();
    if (!to) {
        const err = new Error('CONTACT_MAIL_TO is not set (required when CONTACT_SMTP_* is configured).');
        err.code = 'MAIL_CONFIG';
        err.statusCode = 503;
        throw err;
    }
    return to;
}

function getContactMailToDisplay() {
    const to = String(process.env.CONTACT_MAIL_TO || '').trim();
    return to || '(CONTACT_MAIL_TO non défini)';
}

function isProduction() {
    return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/** En prod, Ethereal uniquement si CONTACT_USE_ETHEREAL=true (staging). Hors prod : toujours autorisé si SMTP absent. */
function etherealFallbackAllowed() {
    if (!isProduction()) return true;
    return ['true', '1', 'yes'].includes(String(process.env.CONTACT_USE_ETHEREAL || '').toLowerCase());
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildFullPhone(phonePrefix, phoneLocal) {
    const raw = String(phoneLocal || '').replace(/[\s().-]/g, '');
    const match = String(phonePrefix || '').match(/^([A-Z]{2})\|(\d+)$/);
    if (!match) return raw ? `+${raw}` : '';
    const dial = match[2];
    return `+${dial} ${raw}`;
}

function buildBodies(data) {
    const rows = [
        ['Objet / Subject', data.subject],
        ['Nom / Name', data.name],
        ['E-mail (réponse)', data.email],
        ['Pays / Country', data.country],
        ['Langue de réponse', data.response_language],
        ['Service', data.service],
        ['Indicatif (brut)', data.phone_prefix],
        ['Téléphone (local)', data.phone_local],
        ['Téléphone (composé)', data.fullPhone],
        ['Message', data.comment],
    ];

    const text = rows.map(([k, v]) => `${k}:\n${v}\n`).join('\n---\n\n');

    const htmlRows = rows
        .map(
            ([k, v]) =>
                `<tr><th style="text-align:left;padding:0.5rem 1rem 0.5rem 0;border-bottom:1px solid #e5e7eb;vertical-align:top;color:#374151;">${escapeHtml(
                    k
                )}</th><td style="padding:0.5rem 0;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(
                    v
                ).replace(/\r?\n/g, '<br/>')}</td></tr>`
        )
        .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;">
<p style="margin:0 0 1rem;font-size:0.9rem;color:#6b7280;">Nouveau message depuis le formulaire <strong>Go Drive</strong> — site web.</p>
<table style="border-collapse:collapse;width:100%;max-width:640px;">${htmlRows}</table>
<p style="margin-top:1.25rem;font-size:0.85rem;color:#6b7280;">Répondre directement à ce message pour joindre l’expéditeur (Reply-To configuré).</p>
</body></html>`;

    return { text, html };
}

function getTransporter() {
    const host = process.env.CONTACT_SMTP_HOST || process.env.SMTP_HOST;
    const port = Number(process.env.CONTACT_SMTP_PORT || process.env.SMTP_PORT || 587);
    const user = process.env.CONTACT_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.CONTACT_SMTP_PASS || process.env.SMTP_PASS;
    const secure =
        String(process.env.CONTACT_SMTP_SECURE || process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
        port === 465;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
}

function isMailConfigured() {
    if (getTransporter()) return true;
    return etherealFallbackAllowed();
}

/**
 * @param {object} data validated fields + fullPhone
 * @param {import('multer').File[]} files
 */
async function sendContactEmail(data, files) {
    const uploadValidation = validateContactUploads(files || []);
    if (!uploadValidation.ok) {
        const err = new Error(uploadValidation.message);
        err.code = uploadValidation.code;
        err.statusCode = 400;
        throw err;
    }

    const { text, html } = buildBodies(data);

    const attachments = uploadValidation.files.map((f) => ({
        filename: f.originalname || 'attachment',
        content: f.buffer,
        contentType: f.mimetype || undefined,
    }));

    const transporter = getTransporter();
    if (transporter) {
        const to = getContactMailToOrThrow();
        const fromName = (process.env.CONTACT_MAIL_FROM_NAME || 'Go Drive — site').trim();
        const fromUser = process.env.CONTACT_SMTP_USER || process.env.SMTP_USER;

        await transporter.sendMail({
            from: `"${fromName}" <${fromUser}>`,
            to,
            replyTo: data.email,
            subject: `[Go Drive contact] ${data.subject}`,
            text,
            html,
            attachments,
        });
        return;
    }

    if (!etherealFallbackAllowed()) {
        const err = new Error('Mail transport is not configured (set CONTACT_SMTP_* in .env).');
        err.code = 'MAIL_CONFIG';
        err.statusCode = 503;
        throw err;
    }

    const { transporter: ethTransporter, account } = await getEtherealBundle();
    const intendedTo = getContactMailToDisplay();
    const banner =
        `\n\n---\n[Mode test Ethereal — aucun e-mail réel envoyé. Destinataire prévu : ${intendedTo}]\n`;
    const htmlBanner = `<p style="margin:0 0 1rem;padding:0.75rem 1rem;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;color:#9a3412;font-size:0.9rem;"><strong>Mode test (Ethereal)</strong> — SMTP non configuré. En production, configurez CONTACT_SMTP_*. Destinataire prévu : <strong>${escapeHtml(
        intendedTo
    )}</strong>. Aperçu du message dans l’URL loguée côté serveur.</p>`;

    const info = await ethTransporter.sendMail({
        from: `"Go Drive — test" <${account.user}>`,
        to: account.user,
        replyTo: data.email,
        subject: `[Go Drive contact — TEST] ${data.subject}`,
        text: text + banner,
        html: htmlBanner + html,
        attachments,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('[contact] Ethereal (pas de CONTACT_SMTP_*) — aperçu du message :', previewUrl || '(indisponible)');
}

module.exports = {
    sendContactEmail,
    isMailConfigured,
    buildFullPhone,
};

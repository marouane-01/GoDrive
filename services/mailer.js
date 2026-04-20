const nodemailer = require('nodemailer');

/** @type {Promise<{ transporter: import('nodemailer').Transporter; account: nodemailer.TestAccount }> | null} */
let etherealBundlePromise = null;

/**
 * Lazily creates a single Ethereal test account and SMTP transporter (reused for the process lifetime).
 */
function getEtherealBundle() {
    if (!etherealBundlePromise) {
        etherealBundlePromise = (async () => {
            const account = await nodemailer.createTestAccount();
            const transporter = nodemailer.createTransport({
                host: account.smtp.host,
                port: account.smtp.port,
                secure: account.smtp.secure,
                auth: {
                    user: account.user,
                    pass: account.pass,
                },
            });
            return { transporter, account };
        })();
    }
    return etherealBundlePromise;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sends a support message through Ethereal (testing SMTP).
 * @param {{ name: string; email: string; subject: string; message: string }} payload
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
async function sendSupportEmail(payload) {
    const { name, email, subject, message } = payload;
    const { transporter, account } = await getEtherealBundle();

    const safeName = name.replace(/[\r\n<>]/g, ' ').trim().slice(0, 120) || 'Visitor';

    const text = [`Name: ${name}`, `Email: ${email}`, `Subject: ${subject}`, '', message].join('\n');

    const html = `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
<hr/>
<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;">${escapeHtml(message)}</pre>`;

    const info = await transporter.sendMail({
        from: `"Go Drive Support" <${account.user}>`,
        to: account.user,
        replyTo: email,
        subject: `[Support] ${subject}`,
        text,
        html,
    });

    return info;
}

module.exports = {
    sendSupportEmail,
    getEtherealBundle,
};

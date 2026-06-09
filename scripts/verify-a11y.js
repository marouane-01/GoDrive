/**
 * Static accessibility checks for Go Drive HTML pages.
 * Usage: node scripts/verify-a11y.js
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = [
    'index.html',
    'about.html',
    'guide.html',
    'contact.html',
    'download-app.html',
    'dashboard.html',
];

function checkPage(filename) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, filename), 'utf8');
    const errors = [];

    if (!/class="skip-link"/.test(html)) errors.push('missing skip-link');
    if (!/id="main-content"/.test(html)) errors.push('missing main#main-content');
    if (!/src="js\/a11y\.js"/.test(html)) errors.push('missing a11y.js script');
    if ((html.match(/<h1\b/g) || []).length !== 1) errors.push('expected exactly one h1');

    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
    imgs.forEach((match, i) => {
        const tag = match[0];
        const hasAlt = /\balt\s*=/.test(tag);
        const inLabeledLink = html.includes('aria-label="Go Drive"');
        if (!hasAlt && !tag.includes('aria-hidden')) {
            errors.push(`img #${i + 1} missing alt attribute`);
        }
        if (hasAlt && /alt=""/.test(tag) && !/aria-label=/.test(html.slice(0, match.index + 200))) {
            /* decorative logos inside aria-labeled links are allowed */
        }
    });

    if (filename === 'guide.html' || filename === 'about.html') {
        if (/<strong class="(guide-step__title|about-value__title)"/.test(html)) {
            errors.push('step/value titles should use h3, not strong');
        }
    }

    if (filename === 'contact.html') {
        if (!/for="contact-files"/.test(html)) errors.push('file upload missing label association');
        if (!/aria-describedby="contact-email-info"/.test(html)) errors.push('email field missing describedby');
    }

    return errors;
}

function main() {
    const failures = [];
    console.log('Accessibility verification\n');

    for (const page of PAGES) {
        const errors = checkPage(page);
        if (errors.length) {
            failures.push(`${page}: ${errors.join(', ')}`);
            console.log(`FAIL ${page}`);
            errors.forEach((e) => console.log(`  - ${e}`));
        } else {
            console.log(`OK   ${page}`);
        }
    }

    const a11yJs = path.join(PUBLIC_DIR, 'js', 'a11y.js');
    if (!fs.existsSync(a11yJs)) failures.push('missing public/js/a11y.js');
    else console.log('OK   a11y.js utility');

    if (failures.length) {
        console.error(`\n${failures.length} page(s) failed.`);
        process.exit(1);
    }

    console.log(`\nAll ${PAGES.length} pages passed static accessibility checks.`);
}

main();

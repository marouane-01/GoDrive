/**
 * Verifies i18n JSON bundles: key parity across langs and runtime translation.
 * Usage: node scripts/verify-i18n.js [baseUrl]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const LANGS = ['fr', 'en', 'ar'];
const PAGES = ['common', 'home', 'about', 'guide', 'contact', 'download', 'dashboard'];
const HTML_PAGES = [
    { file: 'index.html', page: 'home' },
    { file: 'about.html', page: 'about' },
    { file: 'guide.html', page: 'guide' },
    { file: 'contact.html', page: 'contact' },
    { file: 'download-app.html', page: 'download' },
    { file: 'dashboard.html', page: 'dashboard' },
];

const CRITICAL_KEYS = [
    'nav.home',
    'nav.about',
    'a11y.skip',
    'lang.label',
    'pages.home.title',
    'pages.home.meta',
    'home.hero.eyebrow',
    'home.hero.lead',
    'about.eyebrow',
    'about.hero.lead',
    'guide.hero.lead',
    'contact.card.title',
    'pages.contact.title',
    'pages.contact.meta',
];

function loadBundles(lang) {
    const dict = {};
    for (const page of PAGES) {
        const filePath = path.join(PUBLIC, 'js', 'i18n', lang, `${page}.json`);
        Object.assign(dict, JSON.parse(fs.readFileSync(filePath, 'utf8')));
    }
    return dict;
}

function collectHtmlKeys() {
    const used = new Set();
    const re = /data-i18n(?:-html|-placeholder|-aria-label|-alt|-title)?="([^"]+)"/g;
    for (const { file } of HTML_PAGES) {
        const content = fs.readFileSync(path.join(PUBLIC, file), 'utf8');
        let m;
        while ((m = re.exec(content))) used.add(m[1]);
    }
    return used;
}

function simulateTranslate(lang, page, key) {
    const dict = {};
    const common = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'js', 'i18n', lang, 'common.json'), 'utf8'));
    const pageDict = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'js', 'i18n', lang, `${page}.json`), 'utf8'));
    Object.assign(dict, common, pageDict);
    const val = dict[key];
    return val != null ? val : key;
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http
            .get(url, (res) => {
                let body = '';
                res.on('data', (c) => (body += c));
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`${url} → HTTP ${res.statusCode}`));
                        return;
                    }
                    resolve(JSON.parse(body));
                });
            })
            .on('error', reject);
    });
}

async function main() {
    const failures = [];
    const baseUrl = (process.argv[2] || 'http://localhost:3001').replace(/\/$/, '');

    console.log('i18n verification\n');

    // 1. Key parity across languages
    const frKeys = Object.keys(loadBundles('fr')).sort();
    for (const lang of ['en', 'ar']) {
        const langKeys = Object.keys(loadBundles(lang)).sort();
        const missingInLang = frKeys.filter((k) => !langKeys.includes(k));
        const extraInLang = langKeys.filter((k) => !frKeys.includes(k));
        if (missingInLang.length) failures.push(`${lang}: missing ${missingInLang.length} keys vs fr`);
        if (extraInLang.length) failures.push(`${lang}: extra ${extraInLang.length} keys vs fr`);
        else console.log(`OK   ${lang} key structure matches fr (${langKeys.length} keys)`);
    }

    // 2. Critical keys present
    for (const lang of LANGS) {
        const dict = loadBundles(lang);
        for (const key of CRITICAL_KEYS) {
            if (!dict[key]) failures.push(`Missing critical key ${key} in ${lang}`);
        }
    }
    if (!failures.some((f) => f.includes('critical'))) console.log(`OK   ${CRITICAL_KEYS.length} critical keys in all languages`);

    // 3. HTML-used keys resolvable (fr)
    const used = collectHtmlKeys();
    const frDict = loadBundles('fr');
    const missingHtml = [...used].filter((k) => !frDict[k]);
    if (missingHtml.length) {
        missingHtml.forEach((k) => failures.push(`HTML key missing in fr bundles: ${k}`));
    } else {
        console.log(`OK   All ${used.size} HTML i18n keys found in fr bundles`);
    }

    // 4. Language switch simulation — no raw keys returned
    for (const { page } of HTML_PAGES) {
        for (const lang of LANGS) {
            const title = simulateTranslate(lang, page, `pages.${page}.title`);
            const meta = simulateTranslate(lang, page, `pages.${page}.meta`);
            if (title === `pages.${page}.title`) failures.push(`Raw title key on ${page}/${lang}`);
            if (meta === `pages.${page}.meta`) failures.push(`Raw meta key on ${page}/${lang}`);
        }
    }
    console.log('OK   SEO title/meta resolve for all pages × languages');

    // 5. Sample nav/hero keys EN + AR differ from FR
    const navFr = simulateTranslate('fr', 'home', 'nav.home');
    const navEn = simulateTranslate('en', 'home', 'nav.home');
    const navAr = simulateTranslate('ar', 'home', 'nav.home');
    if (navFr === navEn || navFr === navAr) failures.push('nav.home not translated across languages');
    else console.log('OK   nav.home translates (FR/EN/AR differ)');

    // 6. Live JSON endpoints
    try {
        for (const lang of ['fr', 'en']) {
            const common = await fetchJson(`${baseUrl}/js/i18n/${lang}/common.json`);
            const home = await fetchJson(`${baseUrl}/js/i18n/${lang}/home.json`);
            if (!common['nav.home']) failures.push(`Live ${lang}/common.json missing nav.home`);
            if (!home['home.hero.eyebrow']) failures.push(`Live ${lang}/home.json missing home.hero.eyebrow`);
        }
        console.log('OK   Live JSON bundles served correctly');
    } catch (err) {
        failures.push(`Live server check: ${err.message}`);
    }

    // 7. Legacy source not required at runtime
    const htmlFiles = HTML_PAGES.map((p) => fs.readFileSync(path.join(PUBLIC, p.file), 'utf8')).join('\n');
    if (htmlFiles.includes('i18n-content.js')) failures.push('HTML still loads i18n-content.js');
    else console.log('OK   i18n-content.js not loaded in HTML');

    if (failures.length) {
        console.error('\nFailures:');
        failures.forEach((f) => console.error(`  - ${f}`));
        process.exit(1);
    }

    console.log('\nAll i18n checks passed.');
}

main();

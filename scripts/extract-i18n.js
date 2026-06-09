/**
 * Splits i18n.js + i18n-content.js into per-locale JSON bundles.
 * Run: node scripts/extract-i18n.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'js', 'i18n');

const PAGES = ['common', 'home', 'about', 'guide', 'contact', 'download', 'dashboard'];
const LANGS = ['fr', 'en', 'ar'];

function loadDictionaries() {
    const sandbox = { window: {} };
    vm.createContext(sandbox);

    // Bootstrap mergeDict API (runtime i18n.js is lazy-loader only — not a translation source)
    vm.runInContext(
        `(function () {
            const DICT = { fr: {}, en: {}, ar: {} };
            window.goDriveI18n = {
                DICT,
                mergeDict(extra) {
                    for (const L of ['fr', 'en', 'ar']) {
                        if (extra[L]) Object.assign(DICT[L], extra[L]);
                    }
                },
            };
        })();`,
        sandbox
    );

    vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-core.js'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-content.js'), 'utf8'), sandbox);

    return sandbox.window.goDriveI18n.DICT;
}

function bucketKey(key) {
    const prefix = key.split('.')[0];
    if (prefix === 'pages') return 'common';
    if (['nav', 'lang', 'a11y', 'header', 'modal', 'footer', 'badge'].includes(prefix)) return 'common';
    if (PAGES.includes(prefix)) return prefix;
    return 'common';
}

function main() {
    const dict = loadDictionaries();
    const buckets = {};

    for (const lang of LANGS) {
        buckets[lang] = {};
        for (const page of PAGES) buckets[lang][page] = {};

        for (const [key, value] of Object.entries(dict[lang] || {})) {
            const page = bucketKey(key);
            buckets[lang][page][key] = value;
        }
    }

    for (const lang of LANGS) {
        const langDir = path.join(OUT_DIR, lang);
        fs.mkdirSync(langDir, { recursive: true });

        for (const page of PAGES) {
            const filePath = path.join(langDir, `${page}.json`);
            const json = JSON.stringify(buckets[lang][page], null, 0);
            fs.writeFileSync(filePath, json);
            console.log(`Wrote ${path.relative(ROOT, filePath)} (${(json.length / 1024).toFixed(1)} KB)`);
        }
    }
}

main();

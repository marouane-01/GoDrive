/**
 * Audits translation key coverage across HTML/JS vs JSON bundles.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const LANGS = ['fr', 'en', 'ar'];

function loadCanonicalDict() {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
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

function loadJsonBundles() {
    const dict = { fr: {}, en: {}, ar: {} };
    for (const lang of LANGS) {
        const dir = path.join(PUBLIC, 'js', 'i18n', lang);
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.json')) continue;
            Object.assign(dict[lang], JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
        }
    }
    return dict;
}

function collectUsedKeys() {
    const used = new Set();
    const attrRe = /data-i18n(?:-html|-placeholder|-aria-label|-alt|-title)?="([^"]+)"/g;

    for (const file of fs.readdirSync(PUBLIC)) {
        if (!file.endsWith('.html')) continue;
        const content = fs.readFileSync(path.join(PUBLIC, file), 'utf8');
        let m;
        while ((m = attrRe.exec(content))) used.add(m[1]);
    }

    const jsKeyRe = /t(?:Nav)?\(['"]([a-z][a-z0-9]*(?:\.[a-z][a-z0-9_.]+)+)['"]\)/g;
    for (const file of ['main.js', 'seo.js', 'download-modal.js']) {
        const content = fs.readFileSync(path.join(PUBLIC, 'js', file), 'utf8');
        let m;
        while ((m = jsKeyRe.exec(content))) used.add(m[1]);
    }

    for (const page of ['home', 'about', 'guide', 'contact', 'download', 'dashboard']) {
        used.add(`pages.${page}.title`);
        used.add(`pages.${page}.meta`);
    }

    return used;
}

function main() {
    const used = collectUsedKeys();
    const bundles = loadJsonBundles();
    const legacy = loadCanonicalDict();

    const missing = [];
    for (const key of [...used].sort()) {
        for (const lang of LANGS) {
            if (!bundles[lang][key]) {
                missing.push({ key, lang, legacy: Boolean(legacy[lang]?.[key]) });
            }
        }
    }

    const uniqueKeys = [...new Set(missing.map((m) => m.key))];
    console.log(`Used keys: ${used.size}`);
    console.log(`Missing from JSON bundles: ${uniqueKeys.length} keys`);
    uniqueKeys.forEach((k) => {
        const inLegacy = LANGS.every((l) => legacy[l]?.[k]);
        console.log(`  ${k}${inLegacy ? ' (recoverable from legacy)' : ' (NOT in legacy)'}`);
    });

    for (const lang of LANGS) {
        const bundleKeys = Object.keys(bundles[lang]).sort();
        const enKeys = Object.keys(bundles.en).sort();
        if (lang !== 'en') {
            const onlyEn = enKeys.filter((k) => !bundles[lang][k]);
            const onlyLang = bundleKeys.filter((k) => !bundles.en[k]);
            if (onlyEn.length || onlyLang.length) {
                console.log(`\nStructure mismatch ${lang} vs en: +${onlyLang.length} -${onlyEn.length}`);
            }
        }
    }

    process.exit(uniqueKeys.length ? 1 : 0);
}

main();

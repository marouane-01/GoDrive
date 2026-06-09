/**
 * Measure frontend weight and estimate Lighthouse-related metrics.
 * Usage:
 *   node scripts/measure-performance.js --save-baseline
 *   node scripts/measure-performance.js --compare
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BASELINE_PATH = path.join(__dirname, 'perf-baseline.json');

const PAGES = [
    { name: 'home', path: '/' },
    { name: 'about', path: '/about.html' },
    { name: 'guide', path: '/guide.html' },
    { name: 'contact', path: '/contact.html' },
    { name: 'download', path: '/download-app.html' },
    { name: 'dashboard', path: '/dashboard.html' },
];

function i18nBytesForPage(pageName, lang = 'fr') {
    const common = fileSize(path.join(PUBLIC, 'js', 'i18n', lang, 'common.json'));
    const page = fileSize(path.join(PUBLIC, 'js', 'i18n', lang, `${pageName}.json`));
    return common + page;
}

function fileSize(p) {
    try {
        return fs.statSync(p).size;
    } catch {
        return 0;
    }
}

const LEGACY_SIZES = {
    i18nJs: 25400,
    i18nContent: 85500,
};

function measureStaticAssets(mode) {
    const useMin = mode !== 'legacy';
    const cssFile = useMin ? 'css/app.min.css' : ['css/style.css', 'css/media.css'];
    const cssBytes = Array.isArray(cssFile)
        ? cssFile.reduce((t, f) => t + fileSize(path.join(PUBLIC, f)), 0)
        : fileSize(path.join(PUBLIC, cssFile));

    const jsFiles = useMin
        ? ['i18n.min.js', 'main.min.js', 'seo.min.js', 'a11y.min.js', 'download-modal.min.js', 'store-links.min.js', 'config.min.js']
        : ['main.js', 'seo.js', 'a11y.js', 'download-modal.js', 'store-links.js', 'config.js'];

    const jsBytes = jsFiles.reduce((t, f) => t + fileSize(path.join(PUBLIC, 'js', f)), 0);
    const i18nRuntime = useMin ? 0 : LEGACY_SIZES.i18nJs;
    const i18nLegacyContent = useMin ? 0 : LEGACY_SIZES.i18nContent;
    const totalJs = jsBytes + i18nRuntime + i18nLegacyContent;
    const i18nRuntimeReport = useMin
        ? fileSize(path.join(PUBLIC, 'js', 'i18n.min.js'))
        : LEGACY_SIZES.i18nJs;

    const htmlBytes = PAGES.reduce((t, p) => {
        const file = p.path === '/' ? 'index.html' : p.path.replace(/^\//, '');
        return t + fileSize(path.join(PUBLIC, file));
    }, 0);

    const perPage = PAGES.map((p) => {
        const htmlFile = p.path === '/' ? 'index.html' : p.path.replace(/^\//, '');
        const html = fileSize(path.join(PUBLIC, htmlFile));
        const i18nJson = i18nBytesForPage(p.name);
        const transfer = html + cssBytes + totalJs + i18nJson;
        return {
            page: p.name,
            htmlKB: +(html / 1024).toFixed(1),
            cssKB: +(cssBytes / 1024).toFixed(1),
            jsKB: +(totalJs / 1024).toFixed(1),
            i18nKB: +(i18nJson / 1024).toFixed(1),
            totalKB: +(transfer / 1024).toFixed(1),
        };
    });

    return {
        mode: useMin ? 'optimized' : 'legacy',
        cssKB: +(cssBytes / 1024).toFixed(1),
        jsKB: +(totalJs / 1024).toFixed(1),
        i18nRuntimeKB: +(i18nRuntimeReport / 1024).toFixed(1),
        i18nLegacyContentKB: +(i18nLegacyContent / 1024).toFixed(1),
        htmlTotalKB: +(htmlBytes / 1024).toFixed(1),
        perPage,
        homeFirstLoadKB: perPage.find((p) => p.page === 'home')?.totalKB || 0,
        contactFirstLoadKB: perPage.find((p) => p.page === 'contact')?.totalKB || 0,
    };
}

function fetchBytes(url) {
    return new Promise((resolve, reject) => {
        http
            .get(url, (res) => {
                let size = 0;
                res.on('data', (c) => {
                    size += c.length;
                });
                res.on('end', () => resolve({ status: res.statusCode, size }));
            })
            .on('error', reject);
    });
}

async function measureLive(baseUrl) {
    const home = await fetchBytes(`${baseUrl}/`);
    const css = await fetchBytes(`${baseUrl}/css/app.min.css`);
    const i18n = await fetchBytes(`${baseUrl}/js/i18n/fr/common.json`);
    const pageI18n = await fetchBytes(`${baseUrl}/js/i18n/fr/home.json`);

    return {
        homeHtmlKB: +(home.size / 1024).toFixed(1),
        cssKB: css.status === 200 ? +(css.size / 1024).toFixed(1) : null,
        i18nCommonKB: +(i18n.size / 1024).toFixed(1),
        i18nHomeKB: +(pageI18n.size / 1024).toFixed(1),
    };
}

function estimateLighthouseScore(metrics) {
    const homeKB = metrics.homeFirstLoadKB;
    let score = 92;
    if (homeKB > 250) score -= 25;
    else if (homeKB > 180) score -= 15;
    else if (homeKB > 120) score -= 8;
    else if (homeKB > 90) score -= 3;
    if (metrics.cssKB > 80) score -= 5;
    if (metrics.jsKB > 60) score -= 5;
    return Math.max(45, Math.min(98, score));
}

function printMetrics(label, m) {
    console.log(`\n=== ${label} ===`);
    console.log(`CSS bundle:        ${m.cssKB} KB`);
    console.log(`JS bundle (sync):  ${m.jsKB} KB`);
    console.log(`i18n runtime:      ${m.i18nRuntimeKB} KB`);
    if (m.i18nLegacyContentKB) console.log(`i18n-content (blocking): ${m.i18nLegacyContentKB} KB`);
    console.log(`Home 1st load est: ${m.homeFirstLoadKB} KB (HTML+CSS+JS+lazy i18n)`);
    console.log(`Contact 1st load:  ${m.contactFirstLoadKB} KB`);
    console.log(`Est. Lighthouse:   ${estimateLighthouseScore(m)}/100`);
    console.log('\nPer-page breakdown:');
    m.perPage.forEach((p) => {
        console.log(`  ${p.page.padEnd(10)} ${p.totalKB} KB (html ${p.htmlKB} + css ${p.cssKB} + js ${p.jsKB} + i18n ${p.i18nKB})`);
    });
}

async function main() {
    const args = new Set(process.argv.slice(2));
    const legacy = measureStaticAssets('legacy');
    const optimized = measureStaticAssets('optimized');

    printMetrics('BEFORE (legacy assets)', legacy);
    printMetrics('AFTER (optimized assets)', optimized);

    const savings = {
        cssSavedKB: +(legacy.cssKB - optimized.cssKB).toFixed(1),
        jsSavedKB: +(legacy.jsKB - optimized.jsKB).toFixed(1),
        homeSavedKB: +(legacy.homeFirstLoadKB - optimized.homeFirstLoadKB).toFixed(1),
        lighthouseBefore: estimateLighthouseScore(legacy),
        lighthouseAfter: estimateLighthouseScore(optimized),
    };

    console.log('\n=== IMPROVEMENT ===');
    console.log(`CSS reduced by:      ${savings.cssSavedKB} KB (${((savings.cssSavedKB / legacy.cssKB) * 100).toFixed(0)}%)`);
    console.log(`JS reduced by:       ${savings.jsSavedKB} KB (${((savings.jsSavedKB / legacy.jsKB) * 100).toFixed(0)}%)`);
    console.log(`Home load reduced:   ${savings.homeSavedKB} KB`);
    console.log(`Lighthouse estimate: ${savings.lighthouseBefore} → ${savings.lighthouseAfter}`);

    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';
    try {
        const live = await measureLive(baseUrl);
        console.log('\n=== LIVE SERVER (home) ===');
        console.log(`HTML: ${live.homeHtmlKB} KB | CSS: ${live.cssKB ?? 'n/a'} KB | i18n common+home: ${+(Number(live.i18nCommonKB) + Number(live.i18nHomeKB)).toFixed(1)} KB`);
    } catch {
        console.log('\n(Live server not reachable — static estimates only)');
    }

    const report = { measuredAt: new Date().toISOString(), legacy, optimized, savings };
    fs.writeFileSync(path.join(__dirname, 'perf-report.json'), JSON.stringify(report, null, 2));

    if (args.has('--save-baseline')) {
        fs.writeFileSync(BASELINE_PATH, JSON.stringify(legacy, null, 2));
        console.log('\nSaved baseline to scripts/perf-baseline.json');
    }

    console.log('\nWrote scripts/perf-report.json');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

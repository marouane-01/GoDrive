/**
 * Purge, minify, and bundle frontend assets.
 * Run: node scripts/build-frontend.js
 */
const fs = require('fs');
const path = require('path');
const { PurgeCSS } = require('purgecss');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const HTML_PAGES = [
    'index.html',
    'about.html',
    'guide.html',
    'contact.html',
    'download-app.html',
    'dashboard.html',
    'partials/footer-simple.html',
];

const JS_FILES = [
    'i18n.js',
    'main.js',
    'seo.js',
    'a11y.js',
    'download-modal.js',
    'store-links.js',
    'config.js',
];

async function buildCss() {
    const styleSrc = fs.readFileSync(path.join(PUBLIC, 'css', 'style.css'), 'utf8');
    const mediaSrc = fs.readFileSync(path.join(PUBLIC, 'css', 'media.css'), 'utf8');
    const combined = `${styleSrc}\n${mediaSrc}`;

    const purgeResult = await new PurgeCSS().purge({
        content: HTML_PAGES.map((page) => path.join(PUBLIC, page)),
        css: [{ raw: combined }],
        safelist: {
            standard: [
                'is-active',
                'is-visible',
                'is-menu-open',
                'download-modal-open',
                'phone-country--open',
                'contact-card--phone-open',
                'reveal',
                'hidden',
                'visually-hidden',
                'skip-link',
            ],
            deep: [/^appui/, /^badge/, /^order-card/, /^phone-country/],
            greedy: [/^text-gradient/, /^hero-heading/],
        },
        defaultExtractor: (content) => content.match(/[\w-/%]+(?<!:)/g) || [],
    });

    const purged = purgeResult[0].css;
    const minified = new CleanCSS({
        level: 2,
        format: 'keep-breaks',
    }).minify(purged);

    if (minified.errors.length) {
        throw new Error(minified.errors.join('\n'));
    }

    const outPath = path.join(PUBLIC, 'css', 'app.min.css');
    fs.writeFileSync(outPath, minified.styles);

    return {
        before: Buffer.byteLength(combined, 'utf8'),
        purged: Buffer.byteLength(purged, 'utf8'),
        after: Buffer.byteLength(minified.styles, 'utf8'),
        outPath,
    };
}

async function buildJs() {
    const results = [];

    for (const file of JS_FILES) {
        const srcPath = path.join(PUBLIC, 'js', file);
        const code = fs.readFileSync(srcPath, 'utf8');
        const output = await minify(code, {
            compress: true,
            mangle: false,
            format: { comments: false },
        });

        const outName = file.replace(/\.js$/, '.min.js');
        const outPath = path.join(PUBLIC, 'js', outName);
        fs.writeFileSync(outPath, output.code);

        results.push({
            file,
            before: Buffer.byteLength(code, 'utf8'),
            after: Buffer.byteLength(output.code, 'utf8'),
            outPath,
        });
    }

    return results;
}

async function main() {
    console.log('Building frontend assets...\n');

    const css = await buildCss();
    console.log(
        `CSS  ${(css.before / 1024).toFixed(1)} KB → purged ${(css.purged / 1024).toFixed(1)} KB → min ${(css.after / 1024).toFixed(1)} KB`
    );
    console.log(`     ${path.relative(ROOT, css.outPath)}`);

    const jsResults = await buildJs();
    let jsBefore = 0;
    let jsAfter = 0;
    for (const r of jsResults) {
        jsBefore += r.before;
        jsAfter += r.after;
        console.log(`JS   ${r.file}: ${(r.before / 1024).toFixed(1)} KB → ${(r.after / 1024).toFixed(1)} KB`);
    }
    console.log(`     Total JS: ${(jsBefore / 1024).toFixed(1)} KB → ${(jsAfter / 1024).toFixed(1)} KB`);

    const report = {
        builtAt: new Date().toISOString(),
        css,
        js: { before: jsBefore, after: jsAfter, files: jsResults },
    };
    fs.writeFileSync(path.join(ROOT, 'scripts', 'perf-build-report.json'), JSON.stringify(report, null, 2));
    console.log('\nWrote scripts/perf-build-report.json');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

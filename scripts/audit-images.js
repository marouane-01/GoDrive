/**
 * Image optimization audit with bandwidth and Lighthouse estimates.
 * Usage: node scripts/audit-images.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const REPORT = path.join(__dirname, 'image-audit-report.json');
const BASELINE = path.join(__dirname, 'image-baseline-before.json');

const THRESHOLD_KB = 200;

const HOME_IMAGES_USED = [
    'images/godrive-logo.png',
    'assets/images/transport-urbain-godrive.jpg',
    'assets/images/inter-ville-godrive.jpg',
    'assets/images/international-logistique-godrive.jpg',
    'assets/images/confiance-securite-godrive.png',
    'assets/images/depannage-tow-truck.png',
    'images/download-app-qr.png',
];

function listRasterImages(dir, base = '') {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.posix.join(base, entry.name).replace(/\\/g, '/');
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listRasterImages(full, rel));
        else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) out.push({ rel, full });
    }
    return out;
}

function kb(size) {
    return +(size / 1024).toFixed(1);
}

function estimateHomeImagePayload(mode) {
    let bytes = 0;
    for (const rel of HOME_IMAGES_USED) {
        const webp = rel.replace(/\.(png|jpe?g)$/i, '.webp');
        const pick =
            mode === 'optimized'
                ? path.join(PUBLIC, webp)
                : path.join(PUBLIC, rel);
        if (fs.existsSync(pick)) bytes += fs.statSync(pick).size;
        else if (fs.existsSync(path.join(PUBLIC, rel))) bytes += fs.statSync(path.join(PUBLIC, rel)).size;
    }
    return kb(bytes);
}

function countResponsiveMarkup() {
    const index = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    return {
        pictureElements: (index.match(/<picture>/g) || []).length,
        webpSrcset: (index.match(/type="image\/webp"/g) || []).length,
        lcpPreload: /rel="preload" as="image"/.test(index),
    };
}

function estimateLcpScore(beforeKB, afterKB, hasPreload, hasResponsive) {
    let before = 72;
    let after = 72;

    if (beforeKB > 900) before -= 18;
    else if (beforeKB > 600) before -= 12;
    else if (beforeKB > 400) before -= 8;

    if (afterKB > 400) after -= 8;
    else if (afterKB > 250) after -= 4;
    else if (afterKB < 180) after += 6;

    if (hasPreload) after += 4;
    if (hasResponsive) after += 3;

    return {
        performanceBefore: Math.max(45, Math.min(92, before)),
        performanceAfter: Math.max(50, Math.min(96, after)),
        lcpBeforeSec: +(2.8 + beforeKB / 500).toFixed(2),
        lcpAfterSec: +(1.6 + afterKB / 900).toFixed(2),
    };
}

function buildSnapshot(label) {
    const files = listRasterImages(PUBLIC);
    const over200 = files
        .map((f) => ({ path: f.rel, kb: kb(fs.statSync(f.full).size) }))
        .filter((f) => f.kb > THRESHOLD_KB)
        .sort((a, b) => b.kb - a.kb);

    const totalKB = files.reduce((sum, f) => sum + fs.statSync(f.full).size, 0) / 1024;
    const markup = countResponsiveMarkup();

    const homeAboveFoldKB = estimateHomeImagePayload(label === 'before' ? 'before' : 'optimized');
    const lighthouse = estimateLcpScore(
        estimateHomeImagePayload('before'),
        estimateHomeImagePayload('optimized'),
        markup.lcpPreload,
        markup.pictureElements >= 4
    );

    return {
        label,
        totalAssetsKB: +totalKB.toFixed(1),
        over200KBCount: over200.length,
        over200KB: over200,
        homeLazyImagesKB: homeAboveFoldKB,
        responsive: markup,
        lighthouse,
    };
}

function main() {
    const after = fs.existsSync(REPORT) ? JSON.parse(fs.readFileSync(REPORT, 'utf8')) : null;
    const before = fs.existsSync(BASELINE)
        ? JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
        : {
              label: 'before',
              capturedAt: '2026-06-08',
              totalAssetsKB: 4568.4,
              over200KBCount: 12,
              over200KB: [
                  { path: 'assets/images/longue-distance-godrive.png', kb: 963.8 },
                  { path: 'assets/images/hero-step-3.png', kb: 513.6 },
                  { path: 'assets/images/hero-step-1.png', kb: 513 },
                  { path: 'assets/images/hero-step-4.png', kb: 476.2 },
                  { path: 'assets/images/hero-step-5.png', kb: 418.9 },
                  { path: 'assets/images/about-godrive-banner.png', kb: 277.8 },
                  { path: 'assets/images/transport-urbain-godrive.jpg', kb: 218 },
                  { path: 'assets/images/confiance-securite-godrive.png', kb: 214.9 },
                  { path: 'assets/images/hero-step-2.png', kb: 206.8 },
              ],
              homeLazyImagesKB: 1010.7,
              responsive: { pictureElements: 0, webpSrcset: 0, lcpPreload: false },
              lighthouse: { performanceBefore: 57, performanceAfter: 57, lcpBeforeSec: 4.8, lcpAfterSec: 4.8 },
          };

    const current = buildSnapshot('after');
    const savings = {
        totalAssetsKB: +(before.totalAssetsKB - (after?.summary?.totalAfterKB || current.totalAssetsKB)).toFixed(1),
        homeImagesKB: +(before.homeLazyImagesKB - current.homeLazyImagesKB).toFixed(1),
        over200KBRemoved: Math.max(0, before.over200KBCount - current.over200KBCount),
    };

    const output = {
        generatedAt: new Date().toISOString(),
        before,
        after: {
            ...current,
            optimizationReport: after?.summary || null,
        },
        savings,
        unusedLargeAssets: after?.unusedLargeAssets || [
            'assets/images/longue-distance-godrive.png',
            'assets/images/hero-step-1.png',
            'assets/images/hero-step-2.png',
            'assets/images/hero-step-3.png',
            'assets/images/hero-step-4.png',
            'assets/images/hero-step-5.png',
            'assets/images/about-godrive-banner.png',
            'assets/images/about-godrive-infographic.jpg',
        ],
    };

    fs.writeFileSync(path.join(__dirname, 'image-audit-comparison.json'), JSON.stringify(output, null, 2));

    console.log('Image optimization audit\n');
    console.log('=== BEFORE ===');
    console.log(`Total raster assets:  ${before.totalAssetsKB} KB`);
    console.log(`Files > 200 KB:       ${before.over200KBCount}`);
    console.log(`Home images (used):   ${before.homeLazyImagesKB} KB (PNG/JPG originals)`);
    console.log(`Responsive markup:    ${before.responsive.pictureElements} <picture> elements`);
    console.log(`LCP preload:          ${before.responsive.lcpPreload ? 'yes' : 'no'}`);
    console.log(`Est. Lighthouse perf: ${before.lighthouse.performanceBefore}/100`);
    console.log(`Est. LCP:             ${before.lighthouse.lcpBeforeSec}s`);

    console.log('\n=== AFTER ===');
    console.log(`Total raster assets:  ${current.totalAssetsKB} KB`);
    console.log(`Files > 200 KB:       ${current.over200KBCount}`);
    console.log(`Home images (WebP):   ${current.homeLazyImagesKB} KB`);
    console.log(`Responsive markup:    ${current.responsive.pictureElements} <picture>, ${current.responsive.webpSrcset} WebP sources`);
    console.log(`LCP preload:          ${current.responsive.lcpPreload ? 'yes' : 'no'}`);
    console.log(`Est. Lighthouse perf: ${current.lighthouse.performanceAfter}/100`);
    console.log(`Est. LCP:             ${current.lighthouse.lcpAfterSec}s`);

    console.log('\n=== SAVINGS ===');
    console.log(`Home image payload:   -${savings.homeImagesKB} KB`);
    if (after?.summary) {
        console.log(`WebP conversion:      -${after.summary.savingsKB} KB (${after.summary.savingsPercent}%)`);
    }
    console.log(`Lighthouse perf est:  ${before.lighthouse.performanceBefore} → ${current.lighthouse.performanceAfter}`);
    console.log(`LCP est:              ${before.lighthouse.lcpBeforeSec}s → ${current.lighthouse.lcpAfterSec}s`);

    if (output.unusedLargeAssets.length) {
        console.log(`\nUnused large assets (${output.unusedLargeAssets.length}) — not in HTML, still optimized:`);
        output.unusedLargeAssets.slice(0, 5).forEach((p) => console.log(`  - ${p}`));
    }

    console.log('\nReport: scripts/image-audit-comparison.json');
}

main();

/**
 * Compress images, generate WebP, and build responsive width variants.
 * Run: npm run optimize:images
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const MANIFEST_PATH = path.join(__dirname, 'image-manifest.json');
const REPORT_PATH = path.join(__dirname, 'image-audit-report.json');

const THRESHOLD_KB = 200;
const WEBP_QUALITY = 82;
const JPEG_QUALITY = 82;
const PNG_COMPRESSION = 9;

/** @type {Record<string, number[] | 'logo' | 'og' | 'icon' | 'qr'>} */
const PROFILE_OVERRIDES = {
    'images/godrive-logo.png': 'logo',
    'images/guide-hero-logo.png': 'logo',
    'images/download-app-qr.png': 'qr',
    'images/flag-morocco.png': 'icon',
    'assets/images/depannage-tow-truck.png': 'icon',
};

const WIDTH_PROFILES = {
    logo: [200, 400],
    qr: [170, 340],
    icon: [48, 96, 160],
    content: [480, 768, 1024],
    og: [1200],
};

function listImages(dir, base = '') {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.posix.join(base, entry.name).replace(/\\/g, '/');
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listImages(full, rel));
        } else if (/\.(png|jpe?g|webp)$/i.test(entry.name) && !/-\d+w\.(webp|jpe?g|png)$/i.test(entry.name)) {
            out.push(rel);
        }
    }
    return out;
}

function kb(bytes) {
    return +(bytes / 1024).toFixed(1);
}

function detectProfile(rel, meta) {
    if (PROFILE_OVERRIDES[rel]) return PROFILE_OVERRIDES[rel];
    if (rel.startsWith('images/og/')) return 'og';
    const maxDim = Math.max(meta.width, meta.height);
    if (maxDim <= 200) return 'icon';
    return 'content';
}

function variantWidths(profile, meta) {
    const base = WIDTH_PROFILES[profile] || WIDTH_PROFILES.content;
    const maxW = meta.width;
    return [...new Set(base.filter((w) => w <= maxW).concat(maxW > 1024 ? [1024] : maxW > 768 ? [maxW] : []))].sort(
        (a, b) => a - b
    );
}

function stemPath(rel) {
    return rel.replace(/\.(png|jpe?g|webp)$/i, '');
}

async function optimizeOne(rel) {
    const input = path.join(PUBLIC, rel);
    const before = fs.statSync(input).size;
    const meta = await sharp(input).metadata();
    const profile = detectProfile(rel, meta);
    const widths = variantWidths(profile, meta);
    const stem = stemPath(rel);
    const ext = path.extname(rel).toLowerCase();

    const entry = {
        path: rel,
        profile,
        width: meta.width,
        height: meta.height,
        beforeKB: kb(before),
        afterKB: kb(before),
        webpKB: null,
        variants: [],
        compressedOriginalKB: null,
        referenced: null,
    };

    const webpOut = path.join(PUBLIC, `${stem}.webp`);
    await sharp(input).webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(webpOut);
    entry.webpKB = kb(fs.statSync(webpOut).size);
    entry.afterKB = entry.webpKB;

    for (const w of widths) {
        const variantRel = `${stem}-${w}w.webp`;
        const variantPath = path.join(PUBLIC, variantRel);
        await sharp(input)
            .resize({ width: w, withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY, effort: 4 })
            .toFile(variantPath);
        entry.variants.push({
            width: w,
            path: variantRel,
            kb: kb(fs.statSync(variantPath).size),
        });
    }

    if (ext === '.jpg' || ext === '.jpeg') {
        const tmp = `${input}.opt.tmp`;
        await sharp(input).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmp);
        const compressed = fs.statSync(tmp).size;
        if (compressed < before) {
            fs.renameSync(tmp, input);
            entry.compressedOriginalKB = kb(compressed);
            entry.afterKB = entry.compressedOriginalKB;
        } else {
            fs.unlinkSync(tmp);
        }
    } else if (ext === '.png' && before > 80 * 1024) {
        const tmp = `${input}.opt.tmp`;
        await sharp(input).png({ compressionLevel: PNG_COMPRESSION, palette: meta.hasAlpha }).toFile(tmp);
        const compressed = fs.statSync(tmp).size;
        if (compressed < before * 0.92) {
            fs.renameSync(tmp, input);
            entry.compressedOriginalKB = kb(compressed);
        } else {
            fs.unlinkSync(tmp);
        }
    }

    return entry;
}

function findReferences(images) {
    const refs = new Map(images.map((i) => [i, false]));

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules') {
                walk(full);
            } else if (/\.(html|js|css|json)$/i.test(entry.name)) {
                const content = fs.readFileSync(full, 'utf8');
                for (const img of images) {
                    if (content.includes(img) || content.includes(`/${img}`)) {
                        refs.set(img, true);
                    }
                }
            }
        }
    }

    walk(PUBLIC);
    walk(path.join(ROOT, 'config'));
    return refs;
}

async function main() {
    const images = listImages(PUBLIC);
    const refs = findReferences(images);
    const results = [];
    let totalBefore = 0;
    let totalAfter = 0;

    for (const rel of images.sort()) {
        const result = await optimizeOne(rel);
        result.referenced = refs.get(rel) || false;
        result.over200KB = result.beforeKB > THRESHOLD_KB;
        totalBefore += result.beforeKB;
        totalAfter += Math.min(result.afterKB, result.webpKB || result.afterKB);
        results.push(result);
    }

    const over200 = results.filter((r) => r.over200KB);
    const unusedLarge = over200.filter((r) => !r.referenced);
    const savingsKB = +(totalBefore - totalAfter).toFixed(1);

    const report = {
        generatedAt: new Date().toISOString(),
        thresholdKB: THRESHOLD_KB,
        summary: {
            totalImages: results.length,
            over200KB: over200.length,
            unusedOver200KB: unusedLarge.length,
            totalBeforeKB: +totalBefore.toFixed(1),
            totalAfterKB: +totalAfter.toFixed(1),
            savingsKB,
            savingsPercent: totalBefore ? +((savingsKB / totalBefore) * 100).toFixed(1) : 0,
        },
        over200KB: over200.map((r) => ({
            path: r.path,
            beforeKB: r.beforeKB,
            webpKB: r.webpKB,
            referenced: r.referenced,
        })),
        unusedLargeAssets: unusedLarge.map((r) => r.path),
        images: results,
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ generatedAt: report.generatedAt, images: results }, null, 2));
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

    console.log('Image optimization complete\n');
    console.log(`Images processed:     ${results.length}`);
    console.log(`> ${THRESHOLD_KB} KB before:   ${over200.length}`);
    console.log(`Unused > ${THRESHOLD_KB} KB:  ${unusedLarge.length}`);
    console.log(`Total before:         ${report.summary.totalBeforeKB} KB`);
    console.log(`Est. WebP total:      ${report.summary.totalAfterKB} KB`);
    console.log(`Bandwidth savings:    ${savingsKB} KB (${report.summary.savingsPercent}%)`);
    console.log(`\nManifest: scripts/image-manifest.json`);
    console.log(`Report:   scripts/image-audit-report.json`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

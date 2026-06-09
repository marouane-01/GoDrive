/**
 * Patches HTML/JS to use <picture> + WebP srcset from image-manifest.json.
 * Run after optimize-images.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const MANIFEST = path.join(__dirname, 'image-manifest.json');

function loadManifest() {
    if (!fs.existsSync(MANIFEST)) {
        throw new Error('Run npm run optimize:images first (image-manifest.json missing).');
    }
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

function byPath(manifest, rel) {
    const normalized = rel.replace(/^\//, '');
    return manifest.images.find((i) => i.path === normalized);
}

function publicUrl(rel) {
    if (rel.startsWith('http') || rel.startsWith('/')) return rel;
    if (rel.startsWith('assets/')) return rel;
    return `/${rel}`;
}

function buildSrcset(entry, ext = 'webp') {
    const parts = entry.variants.map((v) => `${publicUrl(v.path)} ${v.width}w`);
    if (ext === 'webp' && entry.webpKB) {
        const webp = entry.path.replace(/\.(png|jpe?g)$/i, '.webp');
        parts.push(`${publicUrl(webp)} ${entry.width}w`);
    } else {
        parts.push(`${publicUrl(entry.path)} ${entry.width}w`);
    }
    return parts.join(', ');
}

function wrapImgWithPicture(imgTag, entry, options = {}) {
    const sizesAttr = options.sizes || imgTag.match(/sizes="([^"]+)"/)?.[1] || '100vw';
    const srcsetWebp = buildSrcset(entry, 'webp');
    const fallback = entry.path.startsWith('/') ? entry.path : entry.path;
    const attrs = imgTag.replace(/^<img\s+/i, '').replace(/\/?>$/, '').replace(/\s*src="[^"]*"/i, '').trim();

    return `<picture>
                                <source type="image/webp" srcset="${srcsetWebp}" sizes="${sizesAttr}">
                                <img src="${fallback}" ${attrs}>
                            </picture>`;
}

function patchLogoImg(html, entry) {
    if (!entry || html.includes('godrive-logo-400w.webp')) return html;

    const srcsetWebp = buildSrcset(entry, 'webp');
    const picture = `<picture>
                <source type="image/webp" srcset="${srcsetWebp}" sizes="(max-width: 768px) 120px, 180px">
                <img src="/images/godrive-logo.png" width="677" height="369" alt="" decoding="async" fetchpriority="high">
            </picture>`;
    const pictureLazy = `<picture>
                <source type="image/webp" srcset="${srcsetWebp}" sizes="(max-width: 768px) 120px, 180px">
                <img src="/images/godrive-logo.png" width="677" height="369" alt="" decoding="async" loading="lazy">
            </picture>`;

    html = html.replace(
        /<a([^>]*class="[^"]*logo[^"]*"[^>]*)><img src="\/images\/godrive-logo\.png" width="677" height="369" alt="" decoding="async" fetchpriority="high"><\/a>/g,
        `<a$1>${picture}</a>`
    );
    html = html.replace(
        /<img src="\/images\/godrive-logo\.png" width="677" height="369" alt="" decoding="async" fetchpriority="high">/g,
        picture
    );
    html = html.replace(
        /<img src="\/images\/godrive-logo\.png" width="677" height="369" alt="" decoding="async" loading="lazy">/g,
        pictureLazy
    );
    html = html.replace(
        /<img src="\/images\/godrive-logo\.png" width="677" height="369" alt="" decoding="async">/g,
        picture.replace(' fetchpriority="high"', '')
    );
    return html;
}

function patchIndexServiceImages(html, manifest) {
    const replacements = [
        {
            path: 'assets/images/transport-urbain-godrive.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1199px) 50vw, 33vw',
            pattern:
                /<img\s+src="assets\/images\/transport-urbain-godrive\.jpg"[\s\S]*?decoding="async">/,
        },
        {
            path: 'assets/images/inter-ville-godrive.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1199px) 50vw, 33vw',
            pattern:
                /<img\s+src="assets\/images\/inter-ville-godrive\.jpg"[\s\S]*?decoding="async">/,
        },
        {
            path: 'assets/images/international-logistique-godrive.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1199px) 50vw, 33vw',
            pattern:
                /<img\s+src="assets\/images\/international-logistique-godrive\.jpg"[\s\S]*?decoding="async">/,
        },
        {
            path: 'assets/images/confiance-securite-godrive.png',
            sizes: '(max-width: 899px) 92vw, 38vw',
            pattern: /<img\s+src="assets\/images\/confiance-securite-godrive\.png"[\s\S]*?decoding="async">/,
        },
        {
            path: 'assets/images/depannage-tow-truck.png',
            sizes: '160px',
            pattern:
                /<img src="assets\/images\/depannage-tow-truck\.png" alt="" width="160" height="160" decoding="async"[\s\S]*?>/,
        },
        {
            path: 'assets/images/depannage-tow-truck.png',
            sizes: '48px',
            pattern:
                /<img src="assets\/images\/depannage-tow-truck\.png" alt="" width="48" height="48" decoding="async"[\s\S]*?>/,
        },
        {
            path: 'images/download-app-qr.png',
            sizes: '170px',
            pattern:
                /<img src="\/images\/download-app-qr\.png" alt="[^"]*" width="170" height="170" loading="lazy" decoding="async"[^>]*>/,
        },
    ];

    for (const item of replacements) {
        const entry = byPath(manifest, item.path);
        if (!entry) continue;
        const match = html.match(item.pattern);
        if (!match || match[0].includes('<picture>')) continue;
        const picture = wrapImgWithPicture(match[0], entry, { sizes: item.sizes });
        html = html.replace(item.pattern, picture);
    }

    return html;
}

function addLcpPreload(html) {
    if (html.includes('rel="preload" as="image" href="/images/godrive-logo')) {
        return html;
    }
    const preload = `    <link rel="preload" as="image" href="/images/godrive-logo-400w.webp" type="image/webp" fetchpriority="high">\n`;
    if (html.includes('css/app.min.css')) {
        return html.replace('<link rel="stylesheet" href="css/app.min.css">', `${preload}<link rel="stylesheet" href="css/app.min.css">`);
    }
    return html.replace('<link rel="stylesheet" href="css/style.css">', `${preload}<link rel="stylesheet" href="css/style.css">`);
}

function patchDownloadModalJs(manifest) {
    const file = path.join(PUBLIC, 'js', 'download-modal.js');
    let js = fs.readFileSync(file, 'utf8');
    const entry = byPath(manifest, 'images/download-app-qr.png');
    if (!entry) return;

    const srcset = entry.variants.map((v) => `/images/download-app-qr-${v.width === 170 ? '170' : v.width}w.webp ${v.width}w`).join(', ');
    js = js.replace(
        "src=\"/images/download-app-qr.png\" width=\"200\" height=\"200\"",
        `src="/images/download-app-qr.webp" srcset="${srcset}" sizes="200px" width="200" height="200"`
    );
    fs.writeFileSync(file, js);
}

function main() {
    const manifest = loadManifest();
    const pages = ['index.html', 'about.html', 'guide.html', 'contact.html', 'download-app.html', 'dashboard.html'];

    for (const page of pages) {
        const filePath = path.join(PUBLIC, page);
        let html = fs.readFileSync(filePath, 'utf8');
        html = patchLogoImg(html, byPath(manifest, 'images/godrive-logo.png'));
        if (page === 'index.html') {
            html = patchIndexServiceImages(html, manifest);
            html = addLcpPreload(html);
        }
        fs.writeFileSync(filePath, html);
        console.log(`Patched ${page}`);
    }

    const footer = path.join(PUBLIC, 'partials', 'footer-simple.html');
    if (fs.existsSync(footer)) {
        let html = fs.readFileSync(footer, 'utf8');
        html = patchLogoImg(html, byPath(manifest, 'images/godrive-logo.png'));
        fs.writeFileSync(footer, html);
        console.log('Patched partials/footer-simple.html');
    }

    patchDownloadModalJs(manifest);
    console.log('Patched js/download-modal.js');
}

main();

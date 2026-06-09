/**
 * Point HTML pages at optimized CSS/JS/font assets.
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const PAGES = ['index.html', 'about.html', 'guide.html', 'contact.html', 'download-app.html', 'dashboard.html'];

const FONT_BLOCK = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@600;700&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@600;700&display=swap" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@600;700&display=swap"></noscript>
    <link rel="stylesheet" href="css/app.min.css">`;

const SCRIPT_BLOCK = `    <script src="js/i18n.min.js" defer></script>
    <script src="js/seo.min.js" defer></script>
    <script src="js/config.min.js" defer></script>
    <script src="js/a11y.min.js" defer></script>
    <script src="js/download-modal.min.js" defer></script>
    <script src="js/main.min.js" defer></script>
    <script src="js/store-links.min.js" defer></script>`;

for (const page of PAGES) {
    const filePath = path.join(PUBLIC, page);
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('css/style.css')) {
        html = html.replace(
            /<link rel="stylesheet" href="css\/style\.css">\r?\n\s*<link rel="stylesheet" href="css\/media\.css">/,
            FONT_BLOCK
        );
    }

    if (html.includes('js/i18n.js')) {
        html = html.replace(
            /<script src="js\/i18n\.js"><\/script>\r?\n\s*<script src="js\/i18n-content\.js"><\/script>\r?\n\s*<script src="js\/seo\.js"><\/script>\r?\n\s*<script src="js\/config\.js"><\/script>\r?\n\s*<script src="js\/a11y\.js"><\/script>\r?\n\s*<script src="js\/download-modal\.js"><\/script>\r?\n\s*<script src="js\/main\.js"><\/script>\r?\n\s*<script src="js\/store-links\.js"><\/script>/,
            SCRIPT_BLOCK
        );
    }

    if (page === 'index.html' && !html.includes('rel="preload" as="image" href="/images/godrive-logo')) {
        const preload =
            '    <link rel="preload" as="image" href="/images/godrive-logo-400w.webp" type="image/webp" fetchpriority="high">\n';
        html = html.replace('<link rel="stylesheet" href="css/app.min.css">', `${preload}<link rel="stylesheet" href="css/app.min.css">`);
    }

    fs.writeFileSync(filePath, html);
    console.log(`Patched ${page}`);
}

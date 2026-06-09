require('dotenv').config();
const { getPublicBaseUrl } = require('../config/appConfig');

const base = getPublicBaseUrl();

const PAGES = [
    { name: 'Home', path: '/', expectPage: 'home' },
    { name: 'About', path: '/about.html', expectPage: 'about' },
    { name: 'Guide', path: '/guide.html', expectPage: 'guide' },
    { name: 'Contact', path: '/contact.html', expectPage: 'contact' },
    { name: 'Download App', path: '/download-app.html', expectPage: 'download' },
    { name: 'Dashboard', path: '/dashboard.html', expectPage: 'dashboard' },
];

const NAV_PATHS = ['/about.html', '/guide.html', '/contact.html', '/download-app.html'];

async function main() {
    console.log(`Base URL: ${base}\n`);

    for (const page of PAGES) {
        const url = `${base}${page.path}`;
        const res = await fetch(url);
        const html = await res.text();
        const checks = {
            status: res.status === 200,
            desktopNav: html.includes('id="header-desktop-nav"'),
            mobileNav: html.includes('id="nav-links"'),
            hamburger: html.includes('id="nav-menu-btn"'),
            dataPage: html.includes(`data-page="${page.expectPage}"`),
            desktopNavCss: html.includes('header-desktop-nav'),
            mainJs: html.includes('js/main.js'),
        };

        const ok = Object.values(checks).every(Boolean);
        console.log(`${ok ? 'PASS' : 'FAIL'} - ${page.name} (${page.path})`);
        if (!ok) {
            Object.entries(checks).forEach(([k, v]) => {
                if (!v) console.log(`       missing/fail: ${k}`);
            });
        }
    }

    console.log('\nCSS rules:');
    const fs = require('fs');
    const css = fs.readFileSync(require('path').join(__dirname, '../public/css/style.css'), 'utf8');
    const cssChecks = {
        'desktop nav display flex @900px': /@media \(min-width: 900px\)[\s\S]*?\.header-desktop-nav[\s\S]*?display:\s*flex/.test(css),
        'hamburger hidden @900px': /@media \(min-width: 900px\)[\s\S]*?\.nav-menu-btn[\s\S]*?display:\s*none/.test(css),
        'desktop nav hidden @899px': /@media \(max-width: 899px\)[\s\S]*?\.header-desktop-nav[\s\S]*?display:\s*none/.test(css),
        'header-nav-link styles': css.includes('.header-nav-link'),
    };
    Object.entries(cssChecks).forEach(([k, v]) => console.log(`${v ? 'PASS' : 'FAIL'} - ${k}`));

    console.log('\nNav link targets (main.js):');
    const mainJs = fs.readFileSync(require('path').join(__dirname, '../public/js/main.js'), 'utf8');
    NAV_PATHS.forEach((p) => {
        console.log(`${mainJs.includes(`'${p}'`) ? 'PASS' : 'FAIL'} - link ${p}`);
    });

    const failed =
        Object.values(cssChecks).filter((v) => !v).length +
        NAV_PATHS.filter((p) => !mainJs.includes(`'${p}'`)).length;
    process.exit(failed ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

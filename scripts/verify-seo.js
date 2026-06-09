/**
 * Verifies SEO endpoints and served HTML meta tags (run with server on PORT).
 * Usage: node scripts/verify-seo.js [baseUrl]
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const { LANGS, PAGES } = require('../config/seoConfig');

const baseUrl = (process.argv[2] || process.env.PUBLIC_BASE_URL || 'http://localhost:3001').replace(
    /\/$/,
    ''
);

const INDEXABLE_PAGES = Object.entries(PAGES)
    .filter(([, page]) => page.indexable)
    .map(([pageKey, page]) => ({ pageKey, file: page.file, path: page.path }));

const ALL_PAGES = Object.entries(PAGES).map(([pageKey, page]) => ({
    pageKey,
    file: page.file,
    path: page.path,
    indexable: page.indexable,
}));

function fetchText(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client
            .get(url, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
            })
            .on('error', reject);
    });
}

function hasTag(html, pattern) {
    return pattern.test(html);
}

async function checkServedPage(page) {
    const url = page.path === '/' ? `${baseUrl}/` : `${baseUrl}${page.path}`;
    const res = await fetchText(url);
    const errors = [];

    if (res.status !== 200) {
        errors.push(`${page.file}: HTTP ${res.status}`);
        return errors;
    }

    const html = res.body;
    const required = [
        [/data-site-base="/, 'data-site-base attribute'],
        [/rel="canonical" href="https?:\/\//, 'absolute canonical link'],
        [/hreflang="fr"/, 'hreflang fr'],
        [/hreflang="en"/, 'hreflang en'],
        [/hreflang="ar"/, 'hreflang ar'],
        [/hreflang="x-default"/, 'hreflang x-default'],
        [/type="application\/ld\+json"/, 'JSON-LD structured data'],
        [/property="og:title"/, 'og:title'],
        [/property="og:description"/, 'og:description'],
        [/property="og:url"/, 'og:url'],
        [/property="og:image" content="https?:\/\//, 'absolute og:image'],
        [/name="twitter:card"/, 'twitter:card'],
        [/name="twitter:title"/, 'twitter:title'],
        [/name="twitter:description"/, 'twitter:description'],
        [/rel="icon"/, 'favicon'],
        [/name="description"/, 'meta description'],
        [/src="js\/seo\.min\.js"|src="js\/seo\.js"/, 'seo.js script'],
    ];

    for (const [pattern, label] of required) {
        if (!hasTag(html, pattern)) {
            errors.push(`${page.file}: missing ${label}`);
        }
    }

    if (!html.includes(PAGES[page.pageKey].ogImage)) {
        errors.push(`${page.file}: missing page-specific og image ${PAGES[page.pageKey].ogImage}`);
    }

    if (page.pageKey === 'dashboard') {
        if (!/name="robots"\s+content="noindex,\s*follow"/i.test(html)) {
            errors.push(`${page.file}: dashboard should have noindex, follow`);
        }
    } else if (!/name="robots"\s+content="index,\s*follow"/i.test(html)) {
        errors.push(`${page.file}: public page should have index, follow`);
    }

    return errors;
}

async function main() {
    const failures = [];

    console.log(`SEO verification — ${baseUrl}\n`);

    for (const page of ALL_PAGES) {
        failures.push(...(await checkServedPage(page)));
    }

    try {
        const robots = await fetchText(`${baseUrl}/robots.txt`);
        if (robots.status !== 200) {
            failures.push(`robots.txt returned HTTP ${robots.status}`);
        } else {
            if (!/User-agent:\s*\*/i.test(robots.body)) failures.push('robots.txt: missing User-agent');
            if (!/Allow:\s*\//i.test(robots.body)) failures.push('robots.txt: missing Allow');
            if (!/Disallow:\s*\/api\//i.test(robots.body)) failures.push('robots.txt: missing Disallow /api/');
            if (!/Sitemap:\s*.+\/sitemap\.xml/i.test(robots.body)) {
                failures.push('robots.txt: missing Sitemap directive');
            }
            console.log('robots.txt OK');
        }

        const sitemap = await fetchText(`${baseUrl}/sitemap.xml`);
        if (sitemap.status !== 200) {
            failures.push(`sitemap.xml returned HTTP ${sitemap.status}`);
        } else {
            if (!sitemap.body.includes('xmlns:xhtml')) {
                failures.push('sitemap.xml: missing xmlns:xhtml for hreflang');
            }
            for (const page of INDEXABLE_PAGES) {
                const loc =
                    page.path === '/'
                        ? `${baseUrl}/`
                        : `${baseUrl}${page.path}${page.path === '/' ? '' : ''}`;
                const defaultLoc = page.path === '/' ? `${baseUrl}/` : `${baseUrl}${page.path}`;
                if (!sitemap.body.includes(`<loc>${defaultLoc}</loc>`) && !sitemap.body.includes(`<loc>${defaultLoc}?lang=fr</loc>`)) {
                    if (!sitemap.body.includes(defaultLoc)) {
                        failures.push(`sitemap.xml: missing ${defaultLoc}`);
                    }
                }
                for (const lang of LANGS) {
                    if (!sitemap.body.includes(`hreflang="${lang}"`)) {
                        failures.push(`sitemap.xml: missing hreflang="${lang}"`);
                        break;
                    }
                }
            }
            if (sitemap.body.includes('dashboard.html')) {
                failures.push('sitemap.xml: dashboard should not be listed');
            }
            console.log('sitemap.xml OK');
        }

        for (const lang of ['en', 'ar']) {
            const about = await fetchText(`${baseUrl}/about.html?lang=${lang}`);
            if (!about.body.includes(`?lang=${lang}`)) {
                failures.push(`about.html?lang=${lang}: hreflang URLs should include lang query`);
            }
        }
        console.log('multilingual hreflang URLs OK');

        const ogHome = await fetchText(`${baseUrl}/images/og/home.jpg`);
        if (ogHome.status !== 200) {
            failures.push(`OG image home.jpg returned HTTP ${ogHome.status}`);
        } else {
            console.log('page-specific OG images OK');
        }
    } catch (err) {
        failures.push(`Could not reach server at ${baseUrl}: ${err.message}`);
    }

    if (failures.length) {
        console.error('\nFailures:');
        failures.forEach((f) => console.error(`  - ${f}`));
        process.exit(1);
    }

    console.log(`\nAll ${ALL_PAGES.length} pages and SEO endpoints passed.`);
}

main();

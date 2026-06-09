/**
 * Advanced SEO audit with scoring.
 * Usage: node scripts/audit-seo.js [baseUrl]
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const { getPublicBaseUrl } = require('../config/appConfig');
const { LANGS, PAGES, getPageMeta, absoluteUrl } = require('../config/seoConfig');
const { buildStructuredData } = require('../utils/seoStructuredData');
const { loadInjectedHtml } = require('../utils/seoHtmlInject');

const baseUrl = (process.argv[2] || process.env.PUBLIC_BASE_URL || 'http://localhost:3001').replace(
    /\/$/,
    ''
);

const INDEXABLE = Object.entries(PAGES).filter(([, p]) => p.indexable);

function fetchText(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client
            .get(url, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => resolve({ status: res.statusCode, body }));
            })
            .on('error', reject);
    });
}

function scoreChecks(checks) {
    const passed = checks.filter((c) => c.pass).length;
    return {
        score: checks.length ? Math.round((passed / checks.length) * 100) : 0,
        passed,
        total: checks.length,
        checks,
    };
}

function auditStaticSource() {
    const checks = [];

    for (const [pageKey, page] of Object.entries(PAGES)) {
        const injected = loadInjectedHtml(pageKey, baseUrl, 'fr');
        checks.push({
            id: `${pageKey}:hreflang`,
            pass: (injected.match(/hreflang="fr"/g) || []).length >= 1 && injected.includes('hreflang="x-default"'),
            detail: 'hreflang fr/en/ar + x-default',
        });
        checks.push({
            id: `${pageKey}:jsonld`,
            pass: /application\/ld\+json/.test(injected),
            detail: 'JSON-LD present',
        });
        checks.push({
            id: `${pageKey}:absolute-canonical`,
            pass: new RegExp(`rel="canonical" href="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(
                injected
            ),
            detail: 'absolute canonical',
        });
        checks.push({
            id: `${pageKey}:absolute-og-image`,
            pass: new RegExp(`property="og:image" content="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(
                injected
            ),
            detail: 'absolute og:image',
        });
        if (pageKey !== 'dashboard') {
            checks.push({
                id: `${pageKey}:page-og-image`,
                pass: injected.includes(page.ogImage),
                detail: `page OG image ${page.ogImage}`,
            });
        }
    }

    return scoreChecks(checks);
}

function auditMultilingual() {
    const checks = [];

    for (const lang of LANGS) {
        const homeMeta = getPageMeta('home', lang);
        checks.push({
            id: `i18n:${lang}:home-title`,
            pass: Boolean(homeMeta.title) && !homeMeta.title.startsWith('pages.'),
            detail: homeMeta.title.slice(0, 60),
        });
    }

    for (const [pageKey] of INDEXABLE) {
        const fr = getPageMeta(pageKey, 'fr');
        const en = getPageMeta(pageKey, 'en');
        const ar = getPageMeta(pageKey, 'ar');
        const uniqueTitles = new Set([fr.title, en.title, ar.title]).size;
        const uniqueDescriptions = new Set([fr.description, en.description, ar.description]).size;
        checks.push({
            id: `i18n:${pageKey}:localized-meta`,
            pass: uniqueTitles >= 2 || uniqueDescriptions === 3,
            detail: `titles=${uniqueTitles} desc=${uniqueDescriptions}`,
        });
    }

    const schema = buildStructuredData('home', baseUrl, 'en');
    checks.push({
        id: 'jsonld:inLanguage',
        pass: schema['@graph'].some((n) => Array.isArray(n.inLanguage) && n.inLanguage.length === 3),
        detail: 'WebSite lists 3 languages',
    });

    return scoreChecks(checks);
}

async function auditLiveEndpoints() {
    const checks = [];

    try {
        const robots = await fetchText(`${baseUrl}/robots.txt`);
        checks.push({ id: 'live:robots', pass: robots.status === 200, detail: `HTTP ${robots.status}` });
        checks.push({
            id: 'live:robots-sitemap',
            pass: /Sitemap:\s*.+\/sitemap\.xml/i.test(robots.body),
            detail: 'sitemap directive',
        });

        const sitemap = await fetchText(`${baseUrl}/sitemap.xml`);
        checks.push({ id: 'live:sitemap', pass: sitemap.status === 200, detail: `HTTP ${sitemap.status}` });
        checks.push({
            id: 'live:sitemap-hreflang',
            pass: sitemap.body.includes('xmlns:xhtml') && sitemap.body.includes('hreflang="en"'),
            detail: 'xhtml hreflang alternates',
        });

        for (const [pageKey, page] of INDEXABLE) {
            const url = page.path === '/' ? `${baseUrl}/` : `${baseUrl}${page.path}`;
            const res = await fetchText(url);
            checks.push({
                id: `live:${pageKey}:html`,
                pass: res.status === 200,
                detail: `HTTP ${res.status}`,
            });
            checks.push({
                id: `live:${pageKey}:hreflang`,
                pass: res.body.includes('hreflang="ar"') && res.body.includes('data-site-base'),
                detail: 'served HTML has hreflang + site base',
            });
            checks.push({
                id: `live:${pageKey}:jsonld`,
                pass: res.body.includes('application/ld+json'),
                detail: 'served JSON-LD',
            });
            checks.push({
                id: `live:${pageKey}:canonical-abs`,
                pass: res.body.includes(`rel="canonical" href="${absoluteUrl(baseUrl, page.path, 'fr')}"`),
                detail: 'absolute canonical in served HTML',
            });
            checks.push({
                id: `live:${pageKey}:og-page-image`,
                pass: res.body.includes(page.ogImage),
                detail: page.ogImage,
            });
        }

        for (const lang of ['en', 'ar']) {
            const res = await fetchText(`${baseUrl}/about.html?lang=${lang}`);
            checks.push({
                id: `live:about:${lang}:href`,
                pass: res.body.includes(`hreflang="${lang}"`) && res.body.includes(`?lang=${lang}`),
                detail: `about.html?lang=${lang}`,
            });
        }
    } catch (err) {
        checks.push({ id: 'live:reachable', pass: false, detail: err.message });
    }

    return scoreChecks(checks);
}

async function main() {
    const staticAudit = auditStaticSource();
    const multilingualAudit = auditMultilingual();
    const liveAudit = await auditLiveEndpoints();

    const sections = [
        { name: 'Static injection', ...staticAudit },
        { name: 'Multilingual SEO', ...multilingualAudit },
        { name: 'Live endpoints', ...liveAudit },
    ];

    const totalPassed = sections.reduce((sum, s) => sum + s.passed, 0);
    const totalChecks = sections.reduce((sum, s) => sum + s.total, 0);
    const overallScore = totalChecks ? Math.round((totalPassed / totalChecks) * 100) : 0;

    const report = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        overallScore,
        totalPassed,
        totalChecks,
        sections,
    };

    const outPath = path.join(__dirname, 'seo-audit-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log(`SEO audit — ${baseUrl}`);
    console.log(`Overall score: ${overallScore}/100 (${totalPassed}/${totalChecks} checks)\n`);

    for (const section of sections) {
        console.log(`${section.name}: ${section.score}/100 (${section.passed}/${section.total})`);
        for (const check of section.checks.filter((c) => !c.pass)) {
            console.log(`  FAIL ${check.id}${check.detail ? ` — ${check.detail}` : ''}`);
        }
    }

    console.log(`\nReport: ${path.relative(path.join(__dirname, '..'), outPath)}`);

    process.exit(overallScore >= 90 ? 0 : 1);
}

main();

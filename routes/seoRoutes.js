const express = require('express');
const { getPublicBaseUrl } = require('../config/appConfig');
const { LANGS, DEFAULT_LANG, getIndexablePages, absoluteUrl } = require('../config/seoConfig');

const router = express.Router();

router.get('/robots.txt', (_req, res) => {
    const base = getPublicBaseUrl();
    res.type('text/plain').send(
        [
            'User-agent: *',
            'Allow: /',
            'Disallow: /api/',
            '',
            `Sitemap: ${base}/sitemap.xml`,
        ].join('\n')
    );
});

router.get('/sitemap.xml', (_req, res) => {
    const base = getPublicBaseUrl();
    const lastmod = new Date().toISOString().slice(0, 10);

    const urls = getIndexablePages()
        .map((page) => {
            const alternates = LANGS.map(
                (lang) =>
                    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${absoluteUrl(base, page.path, lang)}" />`
            ).join('\n');

            const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl(base, page.path, DEFAULT_LANG)}" />`;

            return `  <url>
    <loc>${absoluteUrl(base, page.path, DEFAULT_LANG)}</loc>
${alternates}
${xDefault}
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${page.path === '/' ? '1.0' : page.path.includes('download') ? '0.9' : '0.8'}</priority>
  </url>`;
        })
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

    res.type('application/xml').send(xml);
});

module.exports = router;

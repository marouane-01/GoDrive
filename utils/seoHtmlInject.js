const fs = require('fs');
const path = require('path');

const {
    SITE_NAME,
    LANGS,
    OG_LOCALE,
    DEFAULT_LANG,
    getPageMeta,
    absoluteUrl,
    getPageByKey,
} = require('../config/seoConfig');
const { buildStructuredData } = require('./seoStructuredData');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function upsertMeta(html, attr, key, value) {
    const pattern =
        attr === 'name'
            ? new RegExp(`<meta\\s+name="${key}"[^>]*>`, 'i')
            : new RegExp(`<meta\\s+property="${key}"[^>]*>`, 'i');
    const tag =
        attr === 'name'
            ? `<meta name="${key}" content="${escapeAttr(value)}">`
            : `<meta property="${key}" content="${escapeAttr(value)}">`;

    if (pattern.test(html)) {
        return html.replace(pattern, tag);
    }

    return html.replace('</head>', `    ${tag}\n</head>`);
}

function upsertLink(html, rel, href, hreflang) {
    const hreflangAttr = hreflang ? ` hreflang="${hreflang}"` : '';
    const pattern = hreflang
        ? new RegExp(`<link\\s+rel="${rel}"[^>]*hreflang="${hreflang}"[^>]*>`, 'i')
        : new RegExp(`<link\\s+rel="${rel}"(?![^>]*hreflang)[^>]*>`, 'i');
    const tag = `<link rel="${rel}" href="${escapeAttr(href)}"${hreflangAttr}>`;

    if (pattern.test(html)) {
        return html.replace(pattern, tag);
    }

    return html.replace('</head>', `    ${tag}\n</head>`);
}

function escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function buildHreflangBlock(baseUrl, pagePath) {
    const lines = LANGS.map((lang) => {
        const href = absoluteUrl(baseUrl, pagePath, lang);
        return `<link rel="alternate" hreflang="${lang}" href="${escapeAttr(href)}">`;
    });

    lines.push(
        `<link rel="alternate" hreflang="x-default" href="${escapeAttr(absoluteUrl(baseUrl, pagePath, DEFAULT_LANG))}">`
    );
    return lines.join('\n    ');
}

function upsertJsonLd(html, data) {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    const tag = `<script type="application/ld+json" id="godrive-structured-data">${json}</script>`;
    const pattern = /<script type="application\/ld\+json" id="godrive-structured-data">[\s\S]*?<\/script>/i;

    if (pattern.test(html)) {
        return html.replace(pattern, tag);
    }

    return html.replace('</head>', `    ${tag}\n</head>`);
}

function injectSiteBase(html, baseUrl) {
    if (/data-site-base=/i.test(html)) {
        return html.replace(/data-site-base="[^"]*"/i, `data-site-base="${escapeAttr(baseUrl)}"`);
    }

    return html.replace(/<html([^>]*)>/i, `<html$1 data-site-base="${escapeAttr(baseUrl)}">`);
}

function injectSeoIntoHtml(html, pageKey, baseUrl, lang = DEFAULT_LANG) {
    const page = getPageByKey(pageKey);
    if (!page) return html;

    const meta = getPageMeta(pageKey, lang);
    const pageUrl = absoluteUrl(baseUrl, page.path, lang);
    const imageUrl = absoluteUrl(baseUrl, page.ogImage);

    let output = injectSiteBase(html, baseUrl);

    output = upsertLink(output, 'canonical', pageUrl);
    output = upsertMeta(output, 'name', 'description', meta.description);
    output = upsertMeta(output, 'property', 'og:locale', OG_LOCALE[lang] || OG_LOCALE.fr);
    output = upsertMeta(output, 'property', 'og:site_name', SITE_NAME);
    output = upsertMeta(output, 'property', 'og:type', 'website');
    output = upsertMeta(output, 'property', 'og:title', meta.title);
    output = upsertMeta(output, 'property', 'og:description', meta.description);
    output = upsertMeta(output, 'property', 'og:url', pageUrl);
    output = upsertMeta(output, 'property', 'og:image', imageUrl);
    output = upsertMeta(output, 'name', 'twitter:card', 'summary_large_image');
    output = upsertMeta(output, 'name', 'twitter:title', meta.title);
    output = upsertMeta(output, 'name', 'twitter:description', meta.description);
    output = upsertMeta(output, 'name', 'twitter:image', imageUrl);

    for (const altLang of LANGS) {
        if (altLang === lang) continue;
        output = upsertMeta(output, 'property', 'og:locale:alternate', OG_LOCALE[altLang]);
    }

    const hreflangPattern = /<!-- godrive:hreflang -->[\s\S]*?<!-- \/godrive:hreflang -->/i;
    const hreflangBlock = `<!-- godrive:hreflang -->\n    ${buildHreflangBlock(baseUrl, page.path)}\n    <!-- /godrive:hreflang -->`;

    if (hreflangPattern.test(output)) {
        output = output.replace(hreflangPattern, hreflangBlock);
    } else {
        output = output.replace('</head>', `    ${hreflangBlock}\n</head>`);
    }

    output = upsertJsonLd(output, buildStructuredData(pageKey, baseUrl, lang));

    if (/<title>[^<]*<\/title>/i.test(output)) {
        output = output.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);
    }

    return output;
}

function loadInjectedHtml(pageKey, baseUrl, lang = DEFAULT_LANG) {
    const page = getPageByKey(pageKey);
    if (!page) return null;

    const filePath = path.join(PUBLIC_DIR, page.file);
    const html = fs.readFileSync(filePath, 'utf8');
    return injectSeoIntoHtml(html, pageKey, baseUrl, lang);
}

module.exports = {
    injectSeoIntoHtml,
    loadInjectedHtml,
    buildHreflangBlock,
};

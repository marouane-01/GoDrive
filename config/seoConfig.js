const fs = require('fs');
const path = require('path');

const SITE_NAME = 'Go Drive';
const LANGS = ['fr', 'en', 'ar'];
const OG_LOCALE = { fr: 'fr_FR', en: 'en_US', ar: 'ar_MA' };
const DEFAULT_LANG = 'fr';

const PAGES = {
    home: {
        path: '/',
        file: 'index.html',
        ogImage: '/images/og/home.jpg',
        indexable: true,
        schemaType: 'WebPage',
    },
    about: {
        path: '/about.html',
        file: 'about.html',
        ogImage: '/images/og/about.png',
        indexable: true,
        schemaType: 'AboutPage',
    },
    guide: {
        path: '/guide.html',
        file: 'guide.html',
        ogImage: '/images/og/guide.png',
        indexable: true,
        schemaType: 'WebPage',
    },
    contact: {
        path: '/contact.html',
        file: 'contact.html',
        ogImage: '/images/og/contact.png',
        indexable: true,
        schemaType: 'ContactPage',
    },
    download: {
        path: '/download-app.html',
        file: 'download-app.html',
        ogImage: '/images/og/download.png',
        indexable: true,
        schemaType: 'MobileApplication',
    },
    dashboard: {
        path: '/dashboard.html',
        file: 'dashboard.html',
        ogImage: '/images/godrive-logo.png',
        indexable: false,
        schemaType: 'WebPage',
    },
};

const HTML_ROUTES = Object.fromEntries(
    Object.entries(PAGES).flatMap(([pageKey, page]) => {
        const routes = [[page.path, { pageKey, file: page.file }]];
        if (pageKey === 'home') {
            routes.push(['/index.html', { pageKey, file: page.file }]);
        }
        return routes;
    })
);

const I18N_DIR = path.join(__dirname, '..', 'public', 'js', 'i18n');
const metaCache = {};

function loadCommonBundle(lang) {
    if (!metaCache[lang]) {
        const filePath = path.join(I18N_DIR, lang, 'common.json');
        metaCache[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return metaCache[lang];
}

function getPageMeta(pageKey, lang = DEFAULT_LANG) {
    const bundle = loadCommonBundle(lang);
    return {
        title: bundle[`pages.${pageKey}.title`] || SITE_NAME,
        description: bundle[`pages.${pageKey}.meta`] || '',
    };
}

function absoluteUrl(baseUrl, routePath, lang) {
    const base = String(baseUrl || '').replace(/\/$/, '');
    const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
    const url = new URL(normalized, `${base}/`);
    if (lang && lang !== DEFAULT_LANG) {
        url.searchParams.set('lang', lang);
    }
    return url.toString();
}

function getPageByKey(pageKey) {
    return PAGES[pageKey] || null;
}

function getIndexablePages() {
    return Object.entries(PAGES)
        .filter(([, page]) => page.indexable)
        .map(([pageKey, page]) => ({ pageKey, ...page }));
}

module.exports = {
    SITE_NAME,
    LANGS,
    OG_LOCALE,
    DEFAULT_LANG,
    PAGES,
    HTML_ROUTES,
    getPageMeta,
    absoluteUrl,
    getPageByKey,
    getIndexablePages,
};

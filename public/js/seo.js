(function () {
    const SITE_NAME = 'Go Drive';
    const LANGS = ['fr', 'en', 'ar'];
    const DEFAULT_LANG = 'fr';
    const OG_LOCALE = { fr: 'fr_FR', en: 'en_US', ar: 'ar_MA' };

    const PAGE_PATHS = {
        home: '/',
        about: '/about.html',
        guide: '/guide.html',
        contact: '/contact.html',
        download: '/download-app.html',
        dashboard: '/dashboard.html',
    };

    const PAGE_OG_IMAGES = {
        home: '/images/og/home.jpg',
        about: '/images/og/about.png',
        guide: '/images/og/guide.png',
        contact: '/images/og/contact.png',
        download: '/images/og/download.png',
        dashboard: '/images/godrive-logo.png',
    };

    function getSiteBase() {
        const configured = document.documentElement.getAttribute('data-site-base');
        if (configured && configured.trim()) {
            return configured.trim().replace(/\/$/, '');
        }
        return window.location.origin;
    }

    function absoluteUrl(path, lang) {
        const base = getSiteBase();
        const normalized = path.startsWith('/') ? path : `/${path}`;
        const url = new URL(normalized, `${base}/`);
        if (lang && lang !== DEFAULT_LANG) {
            url.searchParams.set('lang', lang);
        }
        return url.toString();
    }

    function setMetaName(name, content) {
        if (!content) return;
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function setMetaProperty(property, content) {
        if (!content) return;
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('property', property);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function setLinkRel(rel, href, hreflang) {
        if (!href) return;
        const selector = hreflang
            ? `link[rel="${rel}"][hreflang="${hreflang}"]`
            : `link[rel="${rel}"]:not([hreflang])`;
        let el = document.querySelector(selector);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            if (hreflang) el.setAttribute('hreflang', hreflang);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }

    function clearMetaProperty(property) {
        document.querySelectorAll(`meta[property="${property}"]`).forEach((el) => el.remove());
    }

    function t(key) {
        return window.goDriveI18n ? window.goDriveI18n.t(key) : key;
    }

    function getLang() {
        return window.goDriveI18n ? window.goDriveI18n.getLang() : DEFAULT_LANG;
    }

    function applyHreflang(pagePath) {
        for (const lang of LANGS) {
            setLinkRel('alternate', absoluteUrl(pagePath, lang), lang);
        }
        setLinkRel('alternate', absoluteUrl(pagePath, DEFAULT_LANG), 'x-default');
    }

    function applyLocaleAlternates(activeLang) {
        clearMetaProperty('og:locale:alternate');
        for (const lang of LANGS) {
            if (lang === activeLang) continue;
            const el = document.createElement('meta');
            el.setAttribute('property', 'og:locale:alternate');
            el.setAttribute('content', OG_LOCALE[lang]);
            document.head.appendChild(el);
        }
    }

    function buildStructuredData(pageKey, lang, pagePath, title, description, imageUrl) {
        const pageUrl = absoluteUrl(pagePath, lang);
        const websiteUrl = absoluteUrl('/', DEFAULT_LANG);
        const logoUrl = absoluteUrl('/images/godrive-logo.png');
        const websiteId = `${websiteUrl}#website`;
        const organizationId = `${websiteUrl}#organization`;

        const graph = [
            {
                '@type': 'Organization',
                '@id': organizationId,
                name: SITE_NAME,
                url: websiteUrl,
                logo: { '@type': 'ImageObject', url: logoUrl },
            },
            {
                '@type': 'WebSite',
                '@id': websiteId,
                name: SITE_NAME,
                url: websiteUrl,
                inLanguage: LANGS,
                publisher: { '@id': organizationId },
            },
            {
                '@type': pageKey === 'download' ? 'WebPage' : pageSchemaType(pageKey),
                '@id': `${pageUrl}#webpage`,
                url: pageUrl,
                name: title,
                description,
                inLanguage: lang,
                isPartOf: { '@id': websiteId },
                publisher: { '@id': organizationId },
            },
        ];

        if (pageKey === 'download') {
            graph.push({
                '@type': 'MobileApplication',
                '@id': `${pageUrl}#app`,
                name: SITE_NAME,
                operatingSystem: 'iOS, Android',
                applicationCategory: 'BusinessApplication',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'MAD' },
                url: pageUrl,
                description,
                image: imageUrl,
            });
        }

        return { '@context': 'https://schema.org', '@graph': graph };
    }

    function pageSchemaType(pageKey) {
        switch (pageKey) {
            case 'home':
                return 'WebPage';
            case 'about':
                return 'AboutPage';
            case 'contact':
                return 'ContactPage';
            default:
                return 'WebPage';
        }
    }

    function applyJsonLd(pageKey, lang, pagePath, title, description, imageUrl) {
        let el = document.getElementById('godrive-structured-data');
        const data = buildStructuredData(pageKey, lang, pagePath, title, description, imageUrl);
        const json = JSON.stringify(data).replace(/</g, '\\u003c');

        if (!el) {
            el = document.createElement('script');
            el.type = 'application/ld+json';
            el.id = 'godrive-structured-data';
            document.head.appendChild(el);
        }

        el.textContent = json;
    }

    function applySeo() {
        const pageKey = document.body && document.body.getAttribute('data-page');
        if (!pageKey) return;

        const lang = getLang();
        const path = PAGE_PATHS[pageKey] || '/';
        const pageUrl = absoluteUrl(path, lang);
        const titleKey = `pages.${pageKey}.title`;
        const metaKey = `pages.${pageKey}.meta`;
        const title = t(titleKey);
        const description = t(metaKey);
        const imagePath = PAGE_OG_IMAGES[pageKey] || '/images/godrive-logo.png';
        const imageUrl = absoluteUrl(imagePath);

        if (title && title !== titleKey) {
            document.title = title;
        }

        setMetaName('description', description);
        setLinkRel('canonical', pageUrl);
        applyHreflang(path);

        setMetaProperty('og:locale', OG_LOCALE[lang] || OG_LOCALE.fr);
        applyLocaleAlternates(lang);
        setMetaProperty('og:site_name', SITE_NAME);
        setMetaProperty('og:type', 'website');
        setMetaProperty('og:title', title);
        setMetaProperty('og:description', description);
        setMetaProperty('og:url', pageUrl);
        setMetaProperty('og:image', imageUrl);

        setMetaName('twitter:card', 'summary_large_image');
        setMetaName('twitter:title', title);
        setMetaName('twitter:description', description);
        setMetaName('twitter:image', imageUrl);

        applyJsonLd(pageKey, lang, path, title, description, imageUrl);
    }

    function hookI18n() {
        if (!window.goDriveI18n) {
            applySeo();
            return;
        }

        const originalApply = window.goDriveI18n.apply.bind(window.goDriveI18n);
        window.goDriveI18n.apply = function applyWithSeo() {
            originalApply();
            applySeo();
        };

        applySeo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookI18n);
    } else {
        hookI18n();
    }

    window.goDriveSeo = { applySeo, absoluteUrl, getSiteBase, PAGE_OG_IMAGES };
})();

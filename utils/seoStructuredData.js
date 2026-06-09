const {
    SITE_NAME,
    LANGS,
    DEFAULT_LANG,
    getPageMeta,
    absoluteUrl,
    getPageByKey,
} = require('../config/seoConfig');

function buildStructuredData(pageKey, baseUrl, lang = DEFAULT_LANG) {
    const page = getPageByKey(pageKey);
    if (!page) return null;

    const meta = getPageMeta(pageKey, lang);
    const pageUrl = absoluteUrl(baseUrl, page.path, lang);
    const logoUrl = absoluteUrl(baseUrl, '/images/godrive-logo.png');
    const websiteId = `${absoluteUrl(baseUrl, '/', DEFAULT_LANG)}#website`;
    const organizationId = `${absoluteUrl(baseUrl, '/', DEFAULT_LANG)}#organization`;

    const graph = [
        {
            '@type': 'Organization',
            '@id': organizationId,
            name: SITE_NAME,
            url: absoluteUrl(baseUrl, '/', DEFAULT_LANG),
            logo: {
                '@type': 'ImageObject',
                url: logoUrl,
            },
        },
        {
            '@type': 'WebSite',
            '@id': websiteId,
            name: SITE_NAME,
            url: absoluteUrl(baseUrl, '/', DEFAULT_LANG),
            inLanguage: LANGS,
            publisher: { '@id': organizationId },
        },
        {
            '@type': page.schemaType === 'MobileApplication' ? 'WebPage' : page.schemaType,
            '@id': `${pageUrl}#webpage`,
            url: pageUrl,
            name: meta.title,
            description: meta.description,
            inLanguage: lang,
            isPartOf: { '@id': websiteId },
            publisher: { '@id': organizationId },
        },
    ];

    if (page.schemaType === 'MobileApplication') {
        graph.push({
            '@type': 'MobileApplication',
            '@id': `${pageUrl}#app`,
            name: SITE_NAME,
            operatingSystem: 'iOS, Android',
            applicationCategory: 'BusinessApplication',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'MAD',
            },
            url: pageUrl,
            description: meta.description,
            image: absoluteUrl(baseUrl, page.ogImage),
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}

module.exports = {
    buildStructuredData,
};

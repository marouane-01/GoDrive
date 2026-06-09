const { HTML_ROUTES } = require('../config/seoConfig');
const { getPublicBaseUrl } = require('../config/appConfig');
const { loadInjectedHtml } = require('../utils/seoHtmlInject');

function htmlSeoMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
    }

    const route = HTML_ROUTES[req.path];
    if (!route) {
        return next();
    }

    const html = loadInjectedHtml(route.pageKey, getPublicBaseUrl());
    if (!html) {
        return next();
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    if (req.method === 'HEAD') {
        return res.status(200).end();
    }

    return res.status(200).send(html);
}

module.exports = htmlSeoMiddleware;

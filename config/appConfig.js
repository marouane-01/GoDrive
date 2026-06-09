const DEFAULT_PORT = 3001;

function getPort() {
    const port = Number(process.env.PORT);
    if (Number.isFinite(port) && port > 0) {
        return port;
    }
    return DEFAULT_PORT;
}

function getPublicBaseUrl() {
    const configured = String(process.env.PUBLIC_BASE_URL || '')
        .trim()
        .replace(/\/$/, '');

    if (configured) {
        return configured;
    }

    return `http://localhost:${getPort()}`;
}

function isProduction() {
    return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function shouldTrustProxy() {
    if (isProduction()) {
        return true;
    }
    return ['true', '1', 'yes'].includes(String(process.env.TRUST_PROXY || '').toLowerCase());
}

function getTrustProxyHops() {
    const hops = Number(process.env.TRUST_PROXY_HOPS);
    return Number.isFinite(hops) && hops > 0 ? hops : 1;
}

function shouldForceHttps() {
    if (isProduction()) {
        return String(process.env.FORCE_HTTPS || 'true').toLowerCase() !== 'false';
    }
    return ['true', '1', 'yes'].includes(String(process.env.FORCE_HTTPS || '').toLowerCase());
}

module.exports = {
    DEFAULT_PORT,
    getPort,
    getPublicBaseUrl,
    isProduction,
    shouldTrustProxy,
    getTrustProxyHops,
    shouldForceHttps,
};

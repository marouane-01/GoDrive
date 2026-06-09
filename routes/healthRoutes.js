const express = require('express');
const db = require('../config/db');
const { getPort, getPublicBaseUrl, isProduction } = require('../config/appConfig');

const router = express.Router();

router.get('/', async (_req, res) => {
    const payload = {
        status: 'ok',
        service: 'godrive',
        timestamp: new Date().toISOString(),
        environment: isProduction() ? 'production' : 'development',
        port: getPort(),
        publicBaseUrl: getPublicBaseUrl(),
    };

    try {
        await db.query('SELECT 1');
        payload.database = 'ok';
        return res.status(200).json(payload);
    } catch (err) {
        console.error('[health] database check failed:', err.message);
        return res.status(503).json({
            ...payload,
            status: 'degraded',
            database: 'unavailable',
        });
    }
});

module.exports = router;

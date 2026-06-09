require('dotenv').config();
const { getPublicBaseUrl } = require('../config/appConfig');

const base = getPublicBaseUrl();

async function request(path, options = {}) {
    const res = await fetch(`${base}${path}`, options);
    let body = {};
    try {
        body = await res.json();
    } catch {
        body = {};
    }
    return { status: res.status, body };
}

async function login(email) {
    return request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'TestPass123!' }),
    });
}

async function main() {
    const checks = [];

    const clientLogin = await login('client@test.com');
    checks.push(['client login', clientLogin.status === 200 && clientLogin.body.token]);

    const driverLogin = await login('driver@test.com');
    checks.push(['driver login', driverLogin.status === 200 && driverLogin.body.token]);

    const adminLogin = await login('admin@test.com');
    checks.push(['admin login', adminLogin.status === 200 && adminLogin.body.token]);

    const clientToken = clientLogin.body.token;
    const driverToken = driverLogin.body.token;
    const adminToken = adminLogin.body.token;

    const clientCreate = await request('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pickup_location: 'Casablanca',
            dropoff_location: 'Rabat',
            transport_type: 'local',
        }),
    });
    checks.push(['client can create order', clientCreate.status === 201]);

    const driverCreate = await request('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pickup_location: 'A',
            dropoff_location: 'B',
            transport_type: 'local',
        }),
    });
    checks.push(['driver cannot create order', driverCreate.status === 403]);

    const adminCreate = await request('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pickup_location: 'A',
            dropoff_location: 'B',
            transport_type: 'local',
        }),
    });
    checks.push(['admin cannot create order', adminCreate.status === 403]);

    const clientOrders = await request('/api/orders', {
        headers: { Authorization: `Bearer ${clientToken}` },
    });
    checks.push(['client can list own orders', clientOrders.status === 200]);

    const adminOrders = await request('/api/orders', {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    checks.push(['admin can list all orders', adminOrders.status === 200 && adminOrders.body.data.length >= 1]);

    const orderId = clientCreate.body?.data?.id;
    if (orderId) {
        const driverClaim = await request(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted', location: 'Casablanca' }),
        });
        checks.push(['driver can claim pending order', driverClaim.status === 200]);

        const clientUpdate = await request(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted', location: 'Hack' }),
        });
        checks.push(['client cannot update order status', clientUpdate.status === 403]);
    }

    const noToken = await request('/api/orders');
    checks.push(['orders require auth', noToken.status === 401]);

    for (const [label, ok] of checks) {
        console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}`);
    }

    const failed = checks.filter(([, ok]) => !ok).length;
    process.exit(failed ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

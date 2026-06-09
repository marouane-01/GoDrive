const db = require('../config/db');
const { getPublicBaseUrl } = require('../config/appConfig');
const { generateQRCode } = require('../utils/qrcode');
const Joi = require('joi');
const { ROLES } = require('../utils/roles');

const orderSchema = Joi.object({
    pickup_location: Joi.string().required(),
    dropoff_location: Joi.string().required(),
    transport_type: Joi.string().valid('local', 'inter-city', 'international').required(),
});

const STATUS_TRANSITIONS = {
    accepted: { from: ['pending'], claim: true },
    in_transit: { from: ['accepted'], claim: false },
    delivered: { from: ['in_transit'], claim: false },
};

exports.createOrder = async (req, res, next) => {
    try {
        if (req.user.role !== ROLES.CLIENT) {
            return res.status(403).json({ error: 'Only customers can create orders' });
        }

        const { error } = orderSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { pickup_location, dropoff_location, transport_type } = req.body;
        const client_id = req.user.id;

        const newOrder = await db.query(
            'INSERT INTO orders (client_id, pickup_location, dropoff_location, transport_type) VALUES ($1, $2, $3, $4) RETURNING id',
            [client_id, pickup_location, dropoff_location, transport_type]
        );

        const orderId = newOrder.rows[0].id;
        const qrLinkUrl = `${getPublicBaseUrl()}/download-app.html`;
        const qrCode = await generateQRCode(qrLinkUrl);

        await db.query('UPDATE orders SET qr_code = $1 WHERE id = $2', [qrCode, orderId]);

        await db.query('INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)', [orderId, 'pending', pickup_location]);

        res.status(201).json({ success: true, data: { id: orderId, qrCode, qrLinkUrl } });
    } catch (err) {
        next(err);
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        let query;
        let params;

        switch (req.user.role) {
            case ROLES.CLIENT:
                query = 'SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC';
                params = [req.user.id];
                break;
            case ROLES.DRIVER:
                query =
                    "SELECT * FROM orders WHERE driver_id = $1 OR (status = 'pending' AND driver_id IS NULL) ORDER BY created_at DESC";
                params = [req.user.id];
                break;
            case ROLES.ADMIN:
                query = 'SELECT * FROM orders ORDER BY created_at DESC';
                params = [];
                break;
            default:
                return res.status(403).json({ error: 'User role not authorized' });
        }

        const orders = await db.query(query, params);
        res.status(200).json({ success: true, data: orders.rows });
    } catch (err) {
        next(err);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        if (req.user.role !== ROLES.DRIVER) {
            return res.status(403).json({ error: 'Only drivers can update order status' });
        }

        const orderId = Number.parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId) || orderId <= 0) {
            return res.status(400).json({ error: 'Invalid order id' });
        }

        const { status, location } = req.body;
        const driverId = req.user.id;
        const transition = STATUS_TRANSITIONS[status];

        if (!transition) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await db.withTransaction(async (client) => {
            const locked = await client.query(
                'SELECT id, status, driver_id, client_id FROM orders WHERE id = $1 FOR UPDATE',
                [orderId]
            );

            if (locked.rows.length === 0) {
                return { notFound: true };
            }

            const order = locked.rows[0];

            if (transition.claim) {
                if (order.status !== 'pending' || order.driver_id !== null) {
                    return { conflict: true, message: 'Order is not available to claim' };
                }

                const updated = await client.query(
                    'UPDATE orders SET status = $1, driver_id = $2 WHERE id = $3 RETURNING *',
                    [status, driverId, orderId]
                );

                await client.query(
                    'INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)',
                    [orderId, status, location || 'Driver location']
                );

                return { data: updated.rows[0] };
            }

            if (!transition.from.includes(order.status)) {
                return { conflict: true, message: 'Invalid status transition' };
            }

            if (order.driver_id !== driverId) {
                return { forbidden: true };
            }

            const updated = await client.query(
                'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
                [status, orderId]
            );

            await client.query(
                'INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)',
                [orderId, status, location || 'Driver location']
            );

            return { data: updated.rows[0] };
        });

        if (result.notFound) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (result.forbidden) {
            return res.status(403).json({ error: 'Not authorized to update this order' });
        }
        if (result.conflict) {
            return res.status(409).json({ error: result.message });
        }

        res.status(200).json({ success: true, data: result.data });
    } catch (err) {
        next(err);
    }
};

const db = require('../config/db');
const { generateQRCode } = require('../utils/qrcode');
const Joi = require('joi');

const orderSchema = Joi.object({
    pickup_location: Joi.string().required(),
    dropoff_location: Joi.string().required(),
    transport_type: Joi.string().valid('local', 'inter-city', 'international').required()
});

exports.createOrder = async (req, res, next) => {
    try {
        const { error } = orderSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { pickup_location, dropoff_location, transport_type } = req.body;
        const client_id = req.user.id;

        const newOrder = await db.query(
            'INSERT INTO orders (client_id, pickup_location, dropoff_location, transport_type) VALUES ($1, $2, $3, $4) RETURNING id',
            [client_id, pickup_location, dropoff_location, transport_type]
        );

        const orderId = newOrder.rows[0].id;
        const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const qrLinkUrl = `${baseUrl}/download-app.html`;
        const qrCode = await generateQRCode(qrLinkUrl);

        await db.query('UPDATE orders SET qr_code = $1 WHERE id = $2', [qrCode, orderId]);
        
        // Add initial tracking
        await db.query('INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)', [orderId, 'pending', pickup_location]);

        res.status(201).json({ success: true, data: { id: orderId, qrCode, qrLinkUrl } });
    } catch (err) {
        next(err);
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        let query;
        let params = [req.user.id];
        
        if (req.user.role === 'client') {
            query = 'SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC';
        } else {
            // Driver can see their orders or pending orders
            query = 'SELECT * FROM orders WHERE driver_id = $1 OR status = \'pending\' ORDER BY created_at DESC';
        }

        const orders = await db.query(query, params);
        res.status(200).json({ success: true, data: orders.rows });
    } catch (err) {
        next(err);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, location } = req.body;
        const driver_id = req.user.id;

        const validStatuses = ['accepted', 'in_transit', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update order
        const updatedOrder = await db.query(
            'UPDATE orders SET status = $1, driver_id = $2 WHERE id = $3 RETURNING *',
            [status, driver_id, id]
        );

        if (updatedOrder.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Add tracking entry
        await db.query('INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)', [id, status, location || 'Driver location']);

        res.status(200).json({ success: true, data: updatedOrder.rows[0] });
    } catch (err) {
        next(err);
    }
};
const express = require('express');
const { createOrder, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');
const { ROLES } = require('../utils/roles');
const router = express.Router();

router.use(protect);

router.post('/', authorize(ROLES.CLIENT), createOrder);
router.get('/', authorize(ROLES.CLIENT, ROLES.DRIVER, ROLES.ADMIN), getOrders);
router.put('/:id/status', authorize(ROLES.DRIVER), updateOrderStatus);

module.exports = router;

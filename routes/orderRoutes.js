const express = require('express');
const { createOrder, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');
const router = express.Router();

router.use(protect);

router.post('/', authorize('client'), createOrder);
router.get('/', getOrders);
router.put('/:id/status', authorize('driver'), updateOrderStatus);

module.exports = router;
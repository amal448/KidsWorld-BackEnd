import express from 'express';
import * as orderController from '../controllers/orderController.ts';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Routes for Logged-in Users (Self)
// router.get('/check-availability', protect, orderController.checkDeliveryAvailability);
router.post('/cancel/:orderId', protect, orderController.cancelOrder);
router.post('/admin-cancel', protect, orderController.adminCancelOrder);
router.get('/myorders', protect, orderController.myOrders);

export default router;
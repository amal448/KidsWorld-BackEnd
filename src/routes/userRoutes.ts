import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Routes for Logged-in Users (Self)
router.get('/profile', protect, userController.getMyProfile);
router.patch('/update-me', protect, userController.updateMyProfile);
router.get('/my-orders', protect, userController.getMyOrders);

export default router;
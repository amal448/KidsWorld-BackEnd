import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Routes for Logged-in Users (Self)
router.get('/profile', protect, userController.getMyProfile);
router.patch('/update-me', protect, userController.updateMyProfile);
router.get('/my-orders', protect, userController.getMyOrders);

// 2. Admin Routes
router.get('/', protect, authorize('admin'), userController.getAllUsers);
router.patch('/:userId', protect, authorize('admin'), userController.editUser);
router.delete('/:userId', protect, authorize('admin'), userController.deleteUser);
router.get('/analysis', protect, authorize('admin'), userController.getAnalysis);

export default router;
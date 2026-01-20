import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 2. Routes for Admins ONLY
router.get('/', protect, authorize('admin'), adminController.getAllUsers);
router.route('/:id').delete(protect, authorize('admin'), adminController.deleteUser);

export default router;
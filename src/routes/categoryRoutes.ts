// src/routes/categoryRoutes.ts
import express from 'express';
import * as categoryController from '../controllers/categoryController.ts';
import { protect, authorize } from '../middlewares/auth.middleware.ts';
import { upload } from '../middlewares/upload.middleware.ts';
const router = express.Router();

// Anyone can see categories
router.get('/', categoryController.getCategories);
router.post('/', protect, authorize('admin'), upload.single('image'),categoryController.createCategory);

// Only Admins can manage them

router.patch('/:id', protect, authorize('admin'), categoryController.updateCategory);
router.delete('/:id', protect, authorize('admin'), categoryController.deleteCategory);

export default router;
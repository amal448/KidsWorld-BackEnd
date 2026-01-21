// src/routes/categoryRoutes.ts
import express from 'express';
import * as categoryController from '../controllers/categoryController';
import { protect, authorize } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
const router = express.Router();

// Anyone can see categories
router.get('/', categoryController.getCategories);
router.post('/', protect, authorize('admin'), upload.single('image'),categoryController.createCategory);

// Only Admins can manage them

router.patch('/:id', protect, authorize('admin'),  upload.single('image'), categoryController.updateCategory);
router.delete('/:id', protect, authorize('admin'), categoryController.deleteCategory);

export default router;
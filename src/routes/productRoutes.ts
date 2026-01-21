import { upload } from '../middlewares/upload.middleware';
import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import * as productController from '../controllers/productController';

const router = express.Router();

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.get('/featured', productController.getFeaturedProducts);
router.post(
    '/new',
    protect,
    authorize('admin'),
    upload.fields([{ name: 'images', maxCount: 5 }, { name: 'heroVideo', maxCount: 1 }]),
    productController.createProduct
);

router.patch(
    '/:id',
    protect,
    authorize('admin'),
    upload.fields([{ name: 'images', maxCount: 5 }, { name: 'heroVideo', maxCount: 1 }]),
    productController.updateProduct
);

router.delete('/:id', protect, authorize('admin'), productController.deleteProduct);

export default router;
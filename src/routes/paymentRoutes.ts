import express from 'express';
import * as paymentController from '../controllers/paymentController.ts';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Routes for Logged-in Users (Self)
router.post('/', protect, paymentController.initiatePayment);

export default router;
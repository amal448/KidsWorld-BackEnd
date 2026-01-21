import express from 'express';
import * as paymentController from '../controllers/paymentController';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Routes for Logged-in Users (Self)
router.post('/', protect, paymentController.initiatePayment);

// 2. Stripe Webhook (Raw body, no JSON parsing)
// ⚠️ This must be placed BEFORE any body parsing middleware
router.post('/webhook/stripe', express.raw({type: 'application/json'}), paymentController.handleWebhook);

export default router;
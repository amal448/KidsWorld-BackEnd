import express from 'express';
import * as authController from '../controllers/authController.js'; // Import everything as authController
import passport from 'passport';
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOtp);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/refresh-token', authController.refreshToken);

// --- Google Auth Routes ---

/**
 * 1. GET /api/auth/google
 * This route triggers the Google Consent Screen.
 * Use 'get' instead of 'post' because it involves a browser redirect.
 */
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * 2. GET /api/auth/google/callback
 * This is the URL Google redirects the user to after they log in.
 */
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        session: false // <--- CRITICAL: No session stored on server
    }),
    authController.googleSignIn // This controller issues the JWT
);
// Example of a protected route

export default router;
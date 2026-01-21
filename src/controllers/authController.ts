import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import AuthService from '../services/auth.service';
import redis from '../config/redis';
import User from '../models/user';
import OtpService from '../services/otp.service';
import { sendEmail } from '../config/nodeMailer';


// Define this at the top of your controller file
// For cross-domain cookie transmission, use 'none' with secure: true
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // ✅ ALWAYS true in production (HTTPS required)
  sameSite: 'none' as const, // ✅ REQUIRED for cross-domain cookies (frontend.vercel.app -> backend.vercel.app)
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// --- GOOGLE SIGN IN ---
// controllers/authController.ts
export const googleSignIn = async (req: any, res: Response) => {
  try {
    const user = req.user;

    // 1. Generate the same tokens as custom login
    const { accessToken, refreshToken } = await AuthService.generateTokenPair(user._id.toString());

    // 2. Set the Refresh Token in the HTTP-only cookie (This is the key!)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    // 3. Send accessToken in response + redirect
    // Frontend will store token before redirect, so it persists across ports
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?success=true&token=${accessToken}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    console.log("req.body", req.body);

    if (!name || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    const user = await AuthService.registerUser({ name, email, password });

    // OTP FLOW
    await OtpService.checkOtpRestrictions(email);
    await OtpService.generateAndSendOtp(email, name);

    res.status(201).json({
      message: 'User registered. Please verify OTP.',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Registration failed' });
    }
  }
};
// src/controllers/auth.controller.ts

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required' });
      return;
    }

    // 1. Verify OTP via Service
    await OtpService.verifyOtp(email, otp);

    // 2. Update User in DB
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Account verified successfully!',
      isVerified: user.isVerified
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await AuthService.validateLocalLogin(email, password);

    // Standard token generation
    const { accessToken, refreshToken } = await AuthService.generateTokenPair(user._id.toString());

   // Use the EXACT SAME Unified Options
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      accessToken,
      user: { id: user._id, name: user.name, role: user.role }
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};
// --- LOGOUT (Professional Way) ---
export const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      const decoded = jwt.decode(refreshToken) as {
        userId: string;
        jti: string;
      } | null;

      if (decoded?.userId && decoded?.jti) {
        await redis.del(`refresh_token:${decoded.userId}:${decoded.jti}`);
      }
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

// src/controllers/auth.controller.ts

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Get the refresh token from the HttpOnly cookie
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      res.status(401).json({ message: "No refresh token provided" });
      return;
    }

    // 2. Delegate rotation logic to the Service (Redis check + Delete old + Generate new)
    const { accessToken, refreshToken: newRefreshToken, user } = await AuthService.rotateToken(oldRefreshToken);

    // 3. Set the NEW refresh token in the cookie (Rotation)
   res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    console.log("refreshToken user",user);
    
    // 4. Send the NEW access token to the frontend
    res.status(200).json({
      success: true,
      accessToken,
      user, // ✅ THIS IS WHAT FRONTEND NEEDS
    });
  } catch (error: any) {
    // If rotation fails (e.g., token reused/stolen), clear cookie so they must re-login
    res.clearCookie('refreshToken');
    res.status(403).json({ message: error.message || "Invalid session" });
  }
};


// src/controllers/auth.controller.ts

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security: Don't tell hackers if the email exists or not
      return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
    }

    // 1. Generate the token
    const resetToken = await AuthService.generatePasswordResetToken(user._id.toString());

    // 2. Create the link for your Frontend (React)
    // This link contains the token and userId as URL parameters
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user._id}`;

    // 3. Send the Email
    await sendEmail(user.email, "Change your password", "password-reset-template", {
      name: user.name,
      resetUrl: resetUrl // This is the link user clicks in their email
    });

    res.status(200).json({ message: "Reset link sent to your email." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token, newPassword } = req.body;

    // 1. Service Logic: Verify Token & Update DB
    await AuthService.resetPassword(userId, token, newPassword);

    // 2. IMPORTANT: Security step
    // After changing password, we should kill ALL old sessions in Redis
    // This logs the user out of every other device/tab for safety
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) await redis.del(...keys);

    res.status(200).json({ message: "Password updated! You can now log in." });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt'
import redis from '../config/redis'
import User from '../models/user';
import 'dotenv/config'
import { RotateTokenResult } from '../type';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface RefreshTokenPayload extends JwtPayload {
    userId: string;
    jti: string;
}

class AuthService {
    static async registerUser(data: {
        name: string;
        email: string;
        password: string;
    }) {
        const { name, email, password } = data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user',
            isVerified: false,
        });

        return user;
    }
    // 5️⃣ Custom Login with Role Check
    static async validateLocalLogin(email: string, pass: string) {
        const user = await User.findOne({ email });
        if (!user || !user.password) throw new Error("Invalid credentials");

        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) throw new Error("Invalid credentials");

        return user; // Return user to get ID and Role
    }
    // 1️⃣ Generate Access & Refresh Tokens
    static async generateTokenPair(userId: string): Promise<{ accessToken: string; refreshToken: string; }> {
        const jti = crypto.randomBytes(16).toString('hex');
        console.log("JWT_ACCESS_SECRET", process.env.JWT_REFRESH_SECRET, process.env.JWT_ACCESS_SECRET);

        if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
            throw new Error('JWT secrets are not defined');
        }

        const accessToken = jwt.sign(
            { userId },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId, jti },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Store JTI in Redis
        await redis.set(
            `refresh_token:${userId}:${jti}`,
            'valid',
            'EX',
            7 * 24 * 60 * 60
        );

        return { accessToken, refreshToken };
    }

    // 2️⃣ Google Token Verification
    static async verifyGoogleToken(idToken: string): Promise<TokenPayload> {
        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new Error('GOOGLE_CLIENT_ID is not defined');
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error('Invalid Google token payload');
        }

        return payload;
    }

    // 3️⃣ Refresh Token Rotation Logic
    static async rotateToken(oldRefreshToken: string): Promise<RotateTokenResult> {
        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error("JWT_REFRESH_SECRET is not defined");
        }

        const decoded = jwt.verify(
            oldRefreshToken,
            process.env.JWT_REFRESH_SECRET
        ) as RefreshTokenPayload;

        const redisKey = `refresh_token:${decoded.userId}:${decoded.jti}`;
        const isValid = await redis.get(redisKey);

        if (!isValid) {
            // 🚨 REUSE DETECTION — clear all sessions
            const keys = await redis.keys(`refresh_token:${decoded.userId}:*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
            throw new Error("Security Alert: Refresh token reuse detected");
        }

        // Invalidate old refresh token
        await redis.del(redisKey);

        // 🔹 FETCH USER (minimal fields)
        const user = await User.findById(decoded.userId)
            .select("_id name role email avatar walletBalance")
            .lean();

        if (!user) {
            throw new Error("User not found");
        }

        // Issue a new token pair
        const { accessToken, refreshToken } =
            await this.generateTokenPair(decoded.userId);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user._id.toString(),
                name: user.name,
                role: user.role,
                email: user.email,
                avatar: user.avatar,
                walletBalance: user.walletBalance,
            },
        };
    }

    /**
     * Generate a secure random token for password reset
     * and store it in Redis for 10 minutes.
     */
    static async generatePasswordResetToken(userId: string): Promise<string> {
        // 1. Create a random hex string (the token)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 2. Save to Redis: Key includes userId to prevent conflicts
        // Setting 'EX' to 600 means it expires in 600 seconds (10 mins)
        await redis.set(`password_reset:${userId}`, resetToken, "EX", 600);

        return resetToken;
    }

    static async resetPassword(userId: string, token: string, newPass: string): Promise<void> {
        // 1. Check Redis for the Reset Token
        const storedToken = await redis.get(`password_reset:${userId}`);

        if (!storedToken || storedToken !== token) {
            throw new Error("Reset link is invalid or has expired.");
        }

        // 2. Hash the new password
        const hashedPassword = await bcrypt.hash(newPass, 12);

        // 3. Update User in MongoDB
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        // 4. Cleanup: Delete the reset token from Redis
        await redis.del(`password_reset:${userId}`);
    }

}

export default AuthService;

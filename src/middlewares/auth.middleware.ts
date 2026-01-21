import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
    user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    // 1. Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };

        // 3. Attach user to request (so controllers can use req.user.id)
        // We select '-password' to keep the hashed password out of memory
        req.user = await User.findById(decoded.userId).select('-password');
        
        if (!req.user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        next(); // Move to the next middleware or controller
    } catch (error) {
        return res.status(401).json({ message: "Token failed or expired" });
    }
};
// src/middlewares/auth.middleware.ts

export const authorize = (...roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Role (${req.user.role}) is not allowed to access this resource` 
            });
        }
        next();
    };
};
import { Request, Response } from 'express';
import User from '../models/user.ts';
import Order from '../models/order'

// --- USER ACTIONS (Self) ---

export const getMyProfile = async (req: any, res: Response) => {
    // req.user is populated by your 'protect' middleware
    res.status(200).json({ user: req.user });
};

export const updateMyProfile = async (req: any, res: Response) => {
    const { name, avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
        req.user._id, 
        { name, avatar }, 
        { new: true, runValidators: true }
    );

    res.status(200).json({ message: "Profile updated", user });
};
export const getMyOrders = async (req: any, res: Response) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 }) // Newest orders first
            .populate("items.product", "name images");

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- ADMIN ACTIONS ---

export const getAllUsers = async (req: any, res: Response) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('-password') // Exclude password field
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- ADMIN: EDIT USER ---
export const editUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { name, email, avatar, walletBalance } = req.body;

        // Find and update user (excluding role and password)
        const user = await User.findByIdAndUpdate(
            userId,
            { name, email, avatar, walletBalance },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- ADMIN: DELETE USER ---
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            deletedUser: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
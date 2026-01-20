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
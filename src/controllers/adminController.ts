import { Request, Response } from 'express';
import User from "../models/user";
import Order from '../models/order'
import Product from '../models/product'

export const getAllUsers = async (req: Request, res: Response) => {
    const users = await User.find().select('-password'); // Never send passwords!
    res.status(200).json({ count: users.length, users });
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
};


export const getAdminStats = async (req: Request, res: Response) => {
    try {
        // 1. FINANCIAL OVERVIEW
        const totalRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'Completed' } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const totalFeesCollected = await Order.aggregate([
            { $match: { orderStatus: 'Cancelled' } },
            { $group: { _id: null, total: { $sum: "$cancellationFee" } } }
        ]);

        // 2. PRODUCT STATUS OVERVIEW (Your primary focus)
        const activeProducts = await Product.countDocuments({ status: 'active' });
        const outOfStockProducts = await Product.countDocuments({ status: 'out_of_stock' });
        const comingSoonProducts = await Product.countDocuments({ status: 'coming_soon' });

        // 3. ORDER ANALYTICS
        const pendingOrders = await Order.countDocuments({ orderStatus: 'Placed' });
        const processingOrders = await Order.countDocuments({ orderStatus: 'Processing' });
        
        // 4. RECENT ORDERS (Last 5)
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email');

        res.status(200).json({
            success: true,
            stats: {
                revenue: totalRevenue[0]?.total || 0,
                fees: totalFeesCollected[0]?.total || 0,
                usersCount: await User.countDocuments({ role: 'user' }),
            },
            inventory: {
                active: activeProducts,
                outOfStock: outOfStockProducts,
                comingSoon: comingSoonProducts
            },
            orders: {
                pending: pendingOrders,
                processing: processingOrders,
                recent: recentOrders
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

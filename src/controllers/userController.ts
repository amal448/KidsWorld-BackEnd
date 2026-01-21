import { Request, Response } from 'express';
import User from '../models/user';
import Order from '../models/order'
import Product from '../models/product';

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




export const getAnalysis = async (req: Request, res: Response) => {
    try {
        const start = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = req.query.to ? new Date(req.query.to as string) : new Date();

        // Adjust end date to end of day if it's the same as start or just a date string
        if (req.query.to && req.query.to.toString().length <= 10) {
            end.setHours(23, 59, 59, 999);
        }

        const matchStage = {
            createdAt: { $gte: start, $lte: end }
        };

        const analytics = await Order.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    // 1. BIG FOUR METRICS
                    "stats": [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: "$totalAmount" }, // Net Revenue (simplified)
                                orderVolume: { $sum: 1 },
                                activeUsers: { $addToSet: "$user" } // Set of unique user IDs
                            }
                        },
                        {
                            $project: {
                                totalRevenue: 1,
                                orderVolume: 1,
                                activeUsers: { $size: "$activeUsers" },
                                conversionRate: { $literal: 0 } // Placeholder: requires session tracking
                            }
                        }
                    ],

                    // 2. REVENUE VS CANCELLATIONS GRAPH (Daily)
                    "revenueGraph": [
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                                sales: { $sum: { $cond: [{ $ne: ["$orderStatus", "Cancelled"] }, "$totalAmount", 0] } },
                                cancellations: { $sum: { $cond: [{ $eq: ["$orderStatus", "Cancelled"] }, "$totalAmount", 0] } }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ],

                    // 3. ORDER STATUS DISTRIBUTION (Donut)
                    "orderStatus": [
                        {
                            $group: {
                                _id: "$orderStatus",
                                value: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                name: "$_id",
                                value: 1,
                                _id: 0
                            }
                        }
                    ],

                    // 4. CATEGORY PERFORMANCE (Bar)
                    "categoryPerformance": [
                        { $unwind: "$items" },
                        {
                            $lookup: {
                                from: "products",
                                localField: "items.product",
                                foreignField: "_id",
                                as: "productDetails"
                            }
                        },
                        { $unwind: "$productDetails" },
                        {
                            $lookup: {
                                from: "categories",
                                localField: "productDetails.category",
                                foreignField: "_id",
                                as: "categoryDetails"
                            }
                        },
                        { $unwind: "$categoryDetails" },
                        {
                            $group: {
                                _id: "$categoryDetails.name",
                                value: { $sum: "$items.quantity" }, // Start with quantity, could be revenue
                                revenue: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } }
                            }
                        },
                        { $sort: { value: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                name: "$_id",
                                value: 1,
                                revenue: 1,
                                _id: 0
                            }
                        }
                    ]
                }
            }
        ]);

        const result = analytics[0];
        // Format response to match frontend expectations
        res.status(200).json({
            stats: result.stats[0] || { totalRevenue: 0, orderVolume: 0, activeUsers: 0, conversionRate: 0 },
            revenueGraph: result.revenueGraph,
            orderStatus: result.orderStatus,
            categoryPerformance: result.categoryPerformance
        });

    } catch (error: any) {
        console.error("Analysis Error:", error);
        res.status(500).json({ message: "Analysis failed", error: error.message });
    }
};
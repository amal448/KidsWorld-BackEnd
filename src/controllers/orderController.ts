import { Request, Response } from "express";
import Order from "../models/order.ts";
import User from '../models/user.ts'
import { AuthRequest } from "../middlewares/auth.middleware.ts";


export const checkDeliveryAvailability = async (req: Request, res: Response) => {

    const { pincode } = req.body;

    // 1. Use your Geocoding API to get coordinates for the Pincode

    // 2. Calculate distance from your Shop's Fixed Coordinates

    // const distance = await getDistanceViaGeoApi(pincode);



    // if (distance > 20) {

    //     return res.status(400).json({

    //         available: false,

    //         message: "Delivery distance exceeds our 20km limit."

    //     });

    // }



    // Return the calculated shipping fee so frontend can show it early

    // const shippingFee = distance * 10;

    // res.status(200).json({ available: true, shippingFee, distance });

};

// --- USER CANCELLATION (With 10% Deduction) ---
export const cancelOrder = async (req: any, res: Response) => {
    const { orderId } = req.params;
    console.log("cancelOrdercancelOrdercancelOrder",orderId);
    
    const order = await Order.findById(orderId);

    if (!order || order.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: "Order not found" });
    }

    // Block if already on the road
    if (['Delivered', 'OutForDelivery'].includes(order.orderStatus)) {
        return res.status(400).json({ message: "Cannot cancel order already out for delivery." });
    }

    const deduction = order.totalAmount * 0.1;
    const refundAmount = order.totalAmount * 0.9;

    // 1. Refund 90% to User Wallet
    await User.findByIdAndUpdate(req.user._id, {
        $inc: { walletBalance: refundAmount }
    });

    // 2. Record the deduction for Admin reports
    order.orderStatus = 'Cancelled';
    order.paymentStatus = 'Refunded';
    order.cancellationFee = deduction;
    order.refundedAmount = refundAmount;
    await order.save();

    res.status(200).json({ 
        message: `Order cancelled by you. 10% (${deduction}) deducted. ${refundAmount} added to wallet.` 
    });
};

// --- ADMIN CANCELLATION (Full Refund - No Deduction) ---
export const adminCancelOrder = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason } = req.body; // "delivery issues", "faulty product", "out of stock"

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Admin can cancel unless it's already delivered
    if (order.orderStatus === 'Delivered') {
        return res.status(400).json({ message: "Order already delivered." });
    }

    // FULL REFUND logic
    const refundAmount = order.totalAmount;

    // 1. Return 100% to User's Wallet
    await User.findByIdAndUpdate(order.user, {
        $inc: { walletBalance: refundAmount }
    });

    // 2. Update Order with Reason
    order.orderStatus = 'Cancelled';
    order.paymentStatus = 'Refunded';
    order.refundedAmount = refundAmount;
    order.cancellationFee = 0; // No penalty when admin cancels
    // You could also add a field for 'cancellationReason' if you want to track it
    await order.save();

    res.status(200).json({ 
        message: `Order cancelled by Admin (${reason}). Full refund of ${refundAmount} sent to user wallet.` 
    });
};
// 1. Import your custom request type
// If it's in a different file, import it: import { AuthRequest } from '../middleware/authMiddleware';

export const myOrders = async (req: AuthRequest, res: Response) => {
    try {
        // Now TypeScript knows req.user exists
        console.log(req.user);

        if (!req.user) {
            return res.status(401).json({ message: "User not found" });
        }

        const orders = await Order.find({ user: req.user._id })
            .populate('items.product', 'name images price') // Populate product details for the UI
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
import { Request, Response } from "express";
import Order from "../models/order";
import User from '../models/user'
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from '../config/nodeMailer';


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

// --- ADMIN: GET ALL ORDERS ---
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email') // Get user details
            .populate('items.product', 'name images price') // Get product details
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- ADMIN: UPDATE ORDER STATUS ---
export const updateOrderStatus = async (req: Request, res: Response) => {
    console.log("updateOrderStatusupdateOrderStatus",req.body);
    
    try {
        const { orderId } = req.params;
        console.log("orderId",orderId);
        const { orderStatus} = req.body; // status: 'Processing', 'OutForDelivery', 'Delivered', 'Cancelled'

        // Validate status
        const validStatuses = ['Placed', 'Processing', 'OutForDelivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Fetch user separately to ensure it exists
        const user = await User.findById(order.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Cannot change if already delivered
        if (order.orderStatus === 'Delivered' && orderStatus !== 'Delivered') {
            return res.status(400).json({ message: 'Cannot change status of delivered order' });
        }

        const oldStatus = order.orderStatus;

        // Handle Cancellation
        if (orderStatus === 'Cancelled') {
            const refundAmount = order.totalAmount;

            // 1. Add refund to user wallet
            await User.findByIdAndUpdate(order.user, {
                $inc: { walletBalance: refundAmount }
            });

            // 2. Update order
            order.orderStatus = 'Cancelled';
            order.paymentStatus = 'Refunded';
            order.refundedAmount = refundAmount;
            order.cancellationFee = 0;
            await order.save();

            // 3. Send cancellation email to user
            try {
                await sendEmail(
                    user.email,
                    'Your Order Has Been Cancelled',
                    'order-cancelled-template',
                    {
                        name: user.name,
                        orderId: order._id,
                        reason: 'We apologize, but a technical error occurred while processing your order, and it has been cancelled. To ensure you can re-order quickly, your refund has been processed and is now available in your Account Wallet. ',
                        refundAmount,
                        refundedAmount: refundAmount,
                        cancellationFee: 0,
                        frontendUrl: process.env.FRONTEND_URL,
                        items: order.items
                    }
                );
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                // Don't fail the API call if email fails
            }

            return res.status(200).json({
                success: true,
                message: `Order cancelled. Refund of ${refundAmount} sent to user wallet and email notified.`,
                order
            });
        }

        // Handle other status updates
        order.orderStatus = orderStatus as any;
        await order.save();

        // Send status update email to user
        try {
            await sendEmail(
                user.email,
                'Your Order Status Updated',
                'order-status-template',
                {
                    name: user.name,
                    orderId: order._id,
                    status: orderStatus,
                    frontendUrl: process.env.FRONTEND_URL
                }
            );
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.status(200).json({
            success: true,
            message: `Order status updated to ${orderStatus}. User notified via email.`,
            order
        });
    } catch (error: any) {
        console.log("errrrrrr",error);
        
        res.status(500).json({ message: error.message });
    }
};
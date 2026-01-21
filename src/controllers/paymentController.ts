import { Request, Response } from "express";
import Product from "../models/product.js";
import Order from "../models/order.js";
import Stripe from "stripe";
import User from "../models/user.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any
});

export const initiatePayment = async (req: any, res: Response) => {
    const { items, paymentMethod, address, shippingFee, useWallet } = req.body;
    const userId = req.user._id;
    console.log("items",items);

    try {
        // DEBUG: Check all products in DB
        const allProducts = await Product.find().select('_id name');
        console.log("All products in DB:", allProducts.map(p => p._id.toString()));

        // 1. Calculate Official Total from Database (Never trust frontend totals)
        let subtotal = 0;
        const orderItems = [];
        for (const item of items) {
            console.log("Looking for product ID:", item.product);
            const productDoc = await Product.findById(item.product);
            console.log("productDoc",productDoc);
            
            if (!productDoc) return res.status(404).json({ message: "Product not found" });
            subtotal += productDoc.price * item.quantity;
            orderItems.push({ product: item.product, quantity: item.quantity, priceAtPurchase: productDoc.price });
        }

        const tax = subtotal * 0.08;
        const totalAmount = subtotal + tax + (shippingFee || 0);

        // 2. Handle Wallet Deduction
        let walletDeducted = 0;
        let remainingToPay = totalAmount;

        if (useWallet) {
            const user = await User.findById(userId);
            if (user && user.walletBalance > 0) {
                walletDeducted = Math.min(user.walletBalance, totalAmount);
                remainingToPay = totalAmount - walletDeducted;

                // Atomic Update: Deduct money from User
                user.walletBalance -= walletDeducted;
                await user.save();
            }
        }

        // 3. If Fully Paid by Wallet
        if (remainingToPay <= 0) {
            const order = await Order.create({
                user: userId, items: orderItems, subtotal, shippingFee, 
                totalAmount, paymentMethod: 'Wallet', paymentStatus: 'Completed',
                orderStatus: 'Placed', pincode: address.zipCode, deliveryAddress: address
            });
            return res.status(201).json({ message: "Paid via Wallet", order });
        }

        // 4. If Split or COD
        if (paymentMethod === 'COD') {
            const order = await Order.create({
                user: userId, items: orderItems, subtotal, shippingFee, 
                totalAmount, paymentMethod: 'COD', paymentStatus: 'Pending',
                orderStatus: 'Placed', pincode: address.zipCode, deliveryAddress: address
                // Tip: Save walletDeducted in your Order schema to track split payments
            });
            return res.status(201).json({ message: "Order Placed", order });
        }

        // 5. Handle Stripe for Remaining Balance
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'inr',
                    product_data: { name: 'KidsWorld Order Payment' },
                    unit_amount: Math.round(remainingToPay * 100), // Stripe uses cents/paise
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?orderId={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: { userId: userId.toString(), walletUsed: walletDeducted.toString() }
        });

        res.status(200).json({ url: session.url });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        // Logic: Find the order by metadata and update status
        await Order.findOneAndUpdate(
            { user: session.metadata?.userId, paymentStatus: 'Pending' },
            { paymentStatus: 'Completed', orderStatus: 'Processing' }
        );
    }
    res.json({ received: true });
};
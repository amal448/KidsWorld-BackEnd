import { Request, Response } from "express";
import Product from "../models/product.ts";
import Order from "../models/order.ts";
import Stripe from "stripe";

export const initiatePayment = async (req: any, res: Response) => {
    console.log("RECEIVED BODY:", req.body);
    const { items, paymentMethod, address, shippingFee } = req.body;

    try {
        // 1. Calculate Total and Prepare Items for Schema
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const productDoc = await Product.findById(item.productId);
            if (!productDoc) {
                return res.status(404).json({ message: `Product ${item.productId} not found` });
            }

            const itemPrice = productDoc.price;
            subtotal += itemPrice * item.quantity;

            // Mapping frontend 'productId' to Schema 'product' and adding 'priceAtPurchase'
            orderItems.push({
                product: item.productId,
                quantity: item.quantity,
                priceAtPurchase: itemPrice // Required by your validation error
            });
        }

        if (subtotal < 500) return res.status(400).json({ message: "Min order is 500" });

        const totalAmount = subtotal + (shippingFee || 0);

        // 2. Handle COD
        if (paymentMethod === 'COD') {
            const order = await Order.create({
                user: req.user._id,
                items: orderItems, // Using the mapped items
                subtotal: subtotal,
                shippingFee: shippingFee || 0, // Required by your validation error
                totalAmount: totalAmount,
                paymentMethod: 'COD',
                paymentStatus: 'Pending',
                orderStatus: 'Placed',
                pincode: address.zipCode, // Getting it from the nested address object
                deliveryAddress: address
            });

            return res.status(201).json({ message: "COD Order Placed", order });
        }

        // 3. Handle Online (Stripe)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: orderItems.map((i: any) => ({
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Product Order' },
                    unit_amount: i.priceAtPurchase * 100,
                },
                quantity: i.quantity,
            })),
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: { 
                userId: req.user._id.toString(), 
                address: JSON.stringify(address),
                zipCode: address.zipCode 
            }
        });

        res.status(200).json({ url: session.url });

    } catch (error: any) {
        console.error("ORDER ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Logic: Find the order by metadata and update status
        await Order.findOneAndUpdate(
            { user: session.metadata.userId, paymentStatus: 'Pending' },
            { paymentStatus: 'Completed', orderStatus: 'Processing' }
        );
    }
    res.json({ received: true });
};
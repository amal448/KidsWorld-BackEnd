import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: {
    product: mongoose.Types.ObjectId;
    quantity: number;
    priceAtPurchase: number;
  }[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  // distance: number; // KM calculated via your Geocoding API
  pincode: string;
  paymentMethod: 'COD' | 'Online' | 'Wallet';
  paymentStatus: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  orderStatus: 'Placed' | 'Processing' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
  cancellationFee?: number; // Stores the 10% deduction
  refundedAmount?: number; // Stores the 90% returned to wallet
  deliveryAddress: {
    street: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
}

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  // distance: { type: Number },
  pincode: { type: String, required: true },
  paymentMethod: { type: String, enum: ['COD', 'Online', 'Wallet'], required: true },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'], 
    default: 'Pending' 
  },
  orderStatus: { 
    type: String, 
    enum: ['Placed', 'Processing', 'OutForDelivery', 'Delivered', 'Cancelled'], 
    default: 'Placed' 
  },
  cancellationFee: { type: Number, default: 0 },
  refundedAmount: { type: Number, default: 0 },
  deliveryAddress: {
    street: String,
    city: String,
    coordinates: { lat: Number, lng: Number }
  }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', orderSchema);
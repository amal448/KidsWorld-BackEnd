import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: mongoose.Types.ObjectId;
  colors: string[]; // e.g., ['Red', 'Blue']
  images: { url: string; public_id: string }[]; // Array for multiple images
  heroVideo?: { url: string; public_id: string }; // For background GSAP
  status: 'active' | 'out_of_stock' | 'hidden'|'coming_soon';
  isFeatured: Boolean;
  specifications: Record<string, string>; // Flexible object for custom fields
  ratings: number;
  numReviews: number;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  colors: [{ type: String }],
  // Multiple images gallery
  images: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    color: { type: String }
  }],

  // Special media for your GSAP background
  heroVideo: {
    url: String,
    public_id: String
  },
  isFeatured: { 
    type: Boolean, 
    default: false 
  },
  
  status: { 
    type: String, 
    enum: ['active', 'out_of_stock', 'hidden','coming_soon'], 
    default: 'active' 
  },

  // This handles your "different fields for different products" requirement
  specifications: {
    type: Map,
    of: String
  },

  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 }
}, { timestamps: true });

// Indexing for search performance
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model<IProduct>('Product', productSchema);
export default Product;
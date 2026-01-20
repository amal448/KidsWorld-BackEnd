import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    slug: string;
    description?: string;
    image?: {
        url: string;
        public_id: string;
    };
    isActive: boolean;
}

const categorySchema = new Schema<ICategory>({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String },
    image: { url: String, public_id: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ✅ Use async function and remove 'next' to fix Error 2349
categorySchema.pre<ICategory>('save', async function () {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .join('-');
    }
    // No next() call needed with async/await
});

const Category = mongoose.model<ICategory>('Category', categorySchema);
export default Category;
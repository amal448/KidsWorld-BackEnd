import mongoose, { Schema, Document } from "mongoose";

// Optional: Define an interface for TypeScript type safety
export interface IUser extends Document {
    name: string;
    email: string;
    googleId?: string; // 1. Add this to the interface
    password?: string;
    avatar?: string;
    role: 'user' | 'admin';
    isVerified: boolean;
    provider: 'local' | 'google';
    walletBalance: number;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true, sparse: true }, // 2. Add to schema (sparse allows nulls)
    password: { type: String },
    avatar: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    walletBalance: { type: Number, default: 0 }
}, { timestamps: true });
// Correct way to define the model: mongoose.model("ModelName", schema)
const User = mongoose.model<IUser>("User", userSchema);

export default User;
import { Request, Response } from "express";
import Product from "../models/product.ts";

// src/controllers/product.controller.ts
export const createProduct = async (req: Request, res: Response) => {
    console.log("req.body", req.body);
    console.log(
        'FILES KEYS:',
        req.files ? Object.keys(req.files) : 'NO FILES'
    );


    try {
        const { name, description, price, category, specifications } = req.body;

        // Access files from Multer fields
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // 1. Process Image Gallery
        const imageList = files['images']?.map(file => ({
            url: file.path,
            public_id: file.filename
        })) || [];

        // 2. Process Hero Video/GIF
        const videoFile = files['heroVideo']?.[0];
        const heroMedia = videoFile ? {
            url: videoFile.path,
            public_id: videoFile.filename
        } : undefined;
        console.log("FILES RECEIVED:", req.files); // Check if heroVideo exists here
        console.log("VIDEO FILE OBJ:", videoFile); // Check if this is undefined
        console.log("HERO MEDIA OBJ:", heroMedia); // Check if the URL is present
        const product = await Product.create({
            name,
            description,
            price,
            category,
            specifications: JSON.parse(specifications), // Specifications sent as JSON string from frontend
            images: imageList,
            heroVideo: heroMedia
        });

        res.status(201).json({ message: "Product created", product });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// 1. GET ALL PRODUCTS (With Filtering & Search)
// src/controllers/productController.ts

export const getProducts = async (req: Request, res: Response) => {
    try {
        const { category, color, minPrice, maxPrice, search } = req.query;

        // Base query: Only show buyable products
        let query: any = {
            status: { $in: ['active', 'coming_soon'] }
        };

        // 1. Category Filter
        if (category) query.category = category;

        // 2. Color Filter (Matches if the color exists in the colors array)
        if (color) query.colors = color;

        // 3. Price Range Filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // 4. Text Search
        if (search) {
            query.$text = { $search: search as string };
        }

        const products = await Product.find(query)
            .populate('category', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 2. GET SINGLE PRODUCT
export const getProductById = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name');
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.status(200).json(product);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 3. UPDATE PRODUCT (Handles new media + stock status)
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // If specifications are sent as string (from form-data), parse them
        if (updates.specifications) {
            updates.specifications = JSON.parse(updates.specifications);
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Handle new images if uploaded
        if (files && files['images']) {
            const newImages = files['images'].map(file => ({
                url: file.path,
                public_id: file.filename
            }));
            // Use $push if you want to add, or overwrite updates.images to replace
            updates.images = newImages;
        }

        // Handle new video if uploaded
        if (files && files['heroVideo']) {
            updates.heroVideo = {
                url: files['heroVideo'][0].path,
                public_id: files['heroVideo'][0].filename
            };
        }

        const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!product) return res.status(404).json({ message: "Product not found" });
        res.status(200).json({ message: "Product updated successfully", product });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// 4. DELETE PRODUCT
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Note: In a real app, you'd also delete images from Cloudinary here
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch only the 5 most important toys for the GSAP Carousel
export const getFeaturedProducts = async (req: Request, res: Response) => {
    try {
        const featured = await Product.find({
            isFeatured: true,
            status: { $ne: 'hidden' }
        })
            .limit(5)
            .select('name price heroVideo description'); // Only send what the GSAP carousel needs

        res.status(200).json(featured);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
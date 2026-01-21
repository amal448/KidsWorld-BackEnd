// src/controllers/categoryController.ts
import { Request, Response } from 'express';
import Category  from '../models/category.js'

// --- PUBLIC: Get all active categories for the Navbar/Home ---
export const getCategories = async (req: Request, res: Response) => {
    const categories = await Category.find({ isActive: true });
    res.status(200).json(categories);
};

// --- ADMIN: Create a new category ---
// src/controllers/category.controller.ts
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    // Check if a file was uploaded by the middleware
    const file = req.file as any;
    const imageData = file ? { url: file.path, public_id: file.filename } : undefined;

    const category = await Category.create({
      name,
      description,
      image: imageData
    });

    res.status(201).json({ message: "Category created successfully", category });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// --- ADMIN: Update Category (e.g., Change name or Disable) ---
export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log("updateCategoryupdateCategory",id);
    console.log(" req.body req.body", req.body);
    
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true });
    console.log("category",category);
   
    res.status(200).json({ message: "Category updated", category });
};
// --- ADMIN: Delete Category ---
export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.status(200).json({ message: "Category removed" });
};


import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => {
    return {
      folder: 'kids-world-shop',
      resource_type: 'auto', // ✅ CRITICAL FIX
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'gif'],
    };
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 120 * 1024 * 1024, // 20MB max (recommended)
  },
});

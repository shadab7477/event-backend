// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';
import streamifier from 'streamifier';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary configured successfully");

// Direct upload function (using streamifier)
export const uploadToCloudinary = (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Delete function
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper to extract public ID from URL
export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // Remove the Cloudinary domain and get the public ID
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex !== -1) {
      const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/'); // Skip version too
      const publicId = pathAfterUpload.split('.')[0];
      return publicId;
    }
    
    // Fallback: extract filename without extension
    const filename = urlParts[urlParts.length - 1];
    return filename.split('.')[0];
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Create storage for artist profile images
const createArtistProfileStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'artists/profile',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    transformation: [
      { width: 500, height: 500, crop: 'fill', quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      const artistId = req.artist?._id || 'temp';
      return `artist-profile-${artistId}-${timestamp}-${originalName}`;
    },
  },
});

// Create storage for artist gallery images
const createArtistGalleryStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'artists/gallery',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    quality: 'auto',
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      const artistId = req.artist?._id || 'temp';
      return `artist-gallery-${artistId}-${timestamp}-${originalName}`;
    },
  },
});

// Multer upload middlewares
export const uploadArtistProfile = multer({
  storage: createArtistProfileStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, JPG, WEBP, AVIF)!'), false);
    }
  }
});

export const uploadArtistGallery = multer({
  storage: createArtistGalleryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, JPG, WEBP, AVIF)!'), false);
    }
  }
});

// For single image upload (backward compatibility)
export const uploadImage = multer({ 
  storage: createArtistProfileStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

// config/cloudinary.js (add these functions)
// Category storage



// Create storage for category images
const createCategoryStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'categories',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      return `category-${timestamp}-${originalName}`;
    },
  },
});

// Create storage for subcategory images
const createSubcategoryStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'subcategories',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      return `subcategory-${timestamp}-${originalName}`;
    },
  },
});

// Multer upload middlewares
export const uploadCategoryImage = multer({
  storage: createCategoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

export const uploadSubcategoryImage = multer({
  storage: createSubcategoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});



const createEventBannerStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'events/banners',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    transformation: [
      { width: 1200, height: 400, crop: 'fill', quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      return `event-banner-${timestamp}-${originalName}`;
    },
  },
});

const createEventThumbnailStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'events/thumbnails',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    transformation: [
      { width: 400, height: 300, crop: 'fill', quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      return `event-thumbnail-${timestamp}-${originalName}`;
    },
  },
});

const createEventGalleryStorage = () => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'events/gallery',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    quality: 'auto',
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, "");
      return `event-gallery-${timestamp}-${originalName}`;
    },
  },
});

// Multer upload middlewares
const uploadEventBanner = multer({
  storage: createEventBannerStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadEventThumbnail = multer({
  storage: createEventThumbnailStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }
});

const uploadEventGallery = multer({
  storage: createEventGalleryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// For multiple uploads in one route
export const uploadEventImages = (req, res, next) => {
  const uploadBanner = uploadEventBanner.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'thumbnailImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 }
  ]);
  
  uploadBanner(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};
// Export cloudinary instance for direct operations
export { cloudinary };



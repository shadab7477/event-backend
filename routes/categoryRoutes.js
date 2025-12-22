// routes/categoryRoutes.js
import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithSubcategories
} from '../controllers/categoryController.js';
import {
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getSubcategoriesByCategory
} from '../controllers/subcategoryController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { uploadCategoryImage, uploadSubcategoryImage } from '../config/cloudinary.js';

const router = express.Router();

// ===== PUBLIC ROUTES =====

// Category routes
router.get('/', getAllCategories);
router.get('/with-subcategories', getCategoriesWithSubcategories);
router.get('/:id', getCategoryById);

// Subcategory routes (within categories)
router.get('/:categoryId/subcategories', getSubcategoriesByCategory);

// ===== ADMIN PROTECTED ROUTES =====

// Category admin routes
router.post('/', adminMiddleware, uploadCategoryImage.single('image'), createCategory);
router.put('/:id', adminMiddleware, uploadCategoryImage.single('image'), updateCategory);
router.delete('/:id', adminMiddleware, deleteCategory);

// Subcategory routes (standalone)
router.get('/subcategories/all', getAllSubcategories);
router.get('/subcategories/:id', getSubcategoryById);
router.post('/subcategories', adminMiddleware, uploadSubcategoryImage.single('image'), createSubcategory);
router.put('/subcategories/:id', adminMiddleware, uploadSubcategoryImage.single('image'), updateSubcategory);
router.delete('/subcategories/:id', adminMiddleware, deleteSubcategory);

export default router;
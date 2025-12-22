// controllers/categoryController.js
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import { deleteFromCloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories'
    });
  }
};

// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get subcategories for this category
    const subcategories = await Subcategory.find({
      category: category._id,
      isActive: true
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch category'
    });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Check for image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Category image is required'
      });
    }

    // Create category
    const category = await Category.create({
      name,
      description,
      image: req.file.path
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create category'
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    let category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name,
        _id: { $ne: id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    // Handle image upload if new image provided
    if (req.file) {
      // Delete old image
      if (category.image) {
        const publicId = getPublicIdFromUrl(category.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }

      // New image URL
      updates.image = req.file.path;
    }

    // Update category
    category = await Category.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update category'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Subcategory.countDocuments({ 
      category: category._id 
    });
    
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Delete subcategories first.'
      });
    }

    // Delete image from Cloudinary
    if (category.image) {
      const publicId = getPublicIdFromUrl(category.image);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Delete category
    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete category'
    });
  }
};

// @desc    Get all categories with subcategories
// @route   GET /api/categories/with-subcategories
// @access  Public
export const getCategoriesWithSubcategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    // Get subcategories for each category
    const categoriesWithSubcategories = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await Subcategory.find({
          category: category._id,
          isActive: true
        }).sort({ name: 1 });

        return {
          ...category.toObject(),
          subcategories
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithSubcategories.length,
      data: categoriesWithSubcategories
    });
  } catch (error) {
    console.error('Get categories with subcategories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories'
    });
  }
};
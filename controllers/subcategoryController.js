// controllers/subcategoryController.js
import Subcategory from '../models/Subcategory.js';
import Category from '../models/Category.js';
import { deleteFromCloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';

// @desc    Get all subcategories
// @route   GET /api/subcategories
// @access  Public
export const getAllSubcategories = async (req, res) => {
  try {
    const { category } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }

    const subcategories = await Subcategory.find(filter)
      .populate('category', 'name image')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories
    });
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subcategories'
    });
  }
};

// @desc    Get single subcategory by ID
// @route   GET /api/subcategories/:id
// @access  Public
export const getSubcategoryById = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id)
      .populate('category', 'name image');
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Get subcategory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subcategory'
    });
  }
};

// @desc    Create new subcategory
// @route   POST /api/subcategories
// @access  Private/Admin
export const createSubcategory = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    // Check if parent category exists
    const parentCategory = await Category.findById(category);
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found'
      });
    }

    // Check if subcategory with same name exists in same category
    const existingSubcategory = await Subcategory.findOne({
      category,
      name
    });

    if (existingSubcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this name already exists in this category'
      });
    }

    // Check for image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory image is required'
      });
    }

    // Create subcategory
    const subcategory = await Subcategory.create({
      name,
      category,
      description,
      image: req.file.path
    });

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: subcategory
    });
  } catch (error) {
    console.error('Create subcategory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subcategory'
    });
  }
};

// @desc    Update subcategory
// @route   PUT /api/subcategories/:id
// @access  Private/Admin
export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;
    
    let subcategory = await Subcategory.findById(id);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Check if parent category exists (if category is being changed)
    if (category && category !== subcategory.category.toString()) {
      const parentCategory = await Category.findById(category);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    // Check if new name already exists in the same category
    if (name && name !== subcategory.name) {
      const targetCategory = category || subcategory.category;
      const existingSubcategory = await Subcategory.findOne({
        category: targetCategory,
        name,
        _id: { $ne: id }
      });
      
      if (existingSubcategory) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory with this name already exists in this category'
        });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (description !== undefined) updates.description = description;

    // Handle image upload if new image provided
    if (req.file) {
      // Delete old image
      if (subcategory.image) {
        const publicId = getPublicIdFromUrl(subcategory.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }

      // New image URL
      updates.image = req.file.path;
    }

    // Update subcategory
    subcategory = await Subcategory.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Subcategory updated successfully',
      data: subcategory
    });
  } catch (error) {
    console.error('Update subcategory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update subcategory'
    });
  }
};

// @desc    Delete subcategory
// @route   DELETE /api/subcategories/:id
// @access  Private/Admin
export const deleteSubcategory = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Delete image from Cloudinary
    if (subcategory.image) {
      const publicId = getPublicIdFromUrl(subcategory.image);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Delete subcategory
    await subcategory.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete subcategory'
    });
  }
};

// @desc    Get subcategories by category
// @route   GET /api/categories/:categoryId/subcategories
// @access  Public
export const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategories = await Subcategory.find({
      category: categoryId,
      isActive: true
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          image: category.image
        },
        subcategories,
        total: subcategories.length
      }
    });
  } catch (error) {
    console.error('Get subcategories by category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subcategories'
    });
  }
};
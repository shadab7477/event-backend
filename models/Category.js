// models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true
  },
  
  // Image
  image: {
    type: String,
    required: [true, 'Category image is required']
  },
  
  // Description
  description: {
    type: String,
    trim: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for name search
categorySchema.index({ name: 'text' });

const Category = mongoose.model('Category', categorySchema);
export default Category;
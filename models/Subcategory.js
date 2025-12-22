// models/Subcategory.js
import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: [true, 'Subcategory name is required'],
    trim: true
  },
  
  // Parent category
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Parent category is required']
  },
  
  // Image
  image: {
    type: String,
    required: [true, 'Subcategory image is required']
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

// Compound index for unique subcategory within category
subcategorySchema.index({ category: 1, name: 1 }, { unique: true });

// Create index for name search
subcategorySchema.index({ name: 'text' });

const Subcategory = mongoose.model('Subcategory', subcategorySchema);
export default Subcategory;
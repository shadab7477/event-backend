// models/Artist.js
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const artistSchema = new mongoose.Schema({
  // Authentication fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  
  // Profile fields
  name: { 
    type: String, 
    required: true 
  },
  stageName: String,
  category: { 
    type: String, 
    enum: ["Singer", "DJ", "Comedian", "Band", "Dancer", "Other"], 
    default: "Other" 
  },
  bio: String,
  genre: [String],
  experience: {
    type: String,
    enum: ["Beginner", "Intermediate", "Professional", "Expert"],
    default: "Beginner"
  },
  
  // Media
  profileImage: String,
  gallery: [String],
  videos: [String],
  portfolio: [String],
  
  // Social links
  socialLinks: {
    instagram: String,
    youtube: String,
    spotify: String,
    facebook: String,
    twitter: String,
    soundcloud: String,
    tiktok: String
  },

  // Contact info
  contactEmail: String,
  phone: String,
  whatsapp: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Professional details
  hourlyRate: Number,
  availability: {
    type: String,
    enum: ["Available", "Busy", "On Tour", "Not Available"],
    default: "Available"
  },
  skills: [String],
  languages: [String],
  
  // Ratings & verification
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5 
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Authentication tokens
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  bookings: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  lastLogin: Date,
  profileComplete: {
    type: Boolean,
    default: false
  }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password before saving
artistSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
artistSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
artistSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Virtual for full address
artistSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr) return '';
  const parts = [];
  if (addr.street) parts.push(addr.street);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);
  return parts.join(', ');
});

// Indexes
artistSchema.index({ name: 'text', stageName: 'text', bio: 'text', genre: 'text' });
artistSchema.index({ category: 1 });
artistSchema.index({ verified: 1 });
artistSchema.index({ rating: -1 });
artistSchema.index({ 'address.city': 1 });
artistSchema.index({ createdAt: -1 });

const Artist = mongoose.model("Artist", artistSchema);
export default Artist;
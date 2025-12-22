// controllers/artistController.js
import Artist from '../models/Artist.js';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';
import jwt from 'jsonwebtoken';

// @desc    Register artist
// @route   POST /api/artists/auth/register
// @access  Public
export const registerArtist = async (req, res) => {
  try {
    const { name, email, password, stageName, category, phone } = req.body;

    // Check if artist exists
    const existingArtist = await Artist.findOne({ email });
    if (existingArtist) {
      return res.status(400).json({
        success: false,
        message: 'Artist already exists with this email'
      });
    }

    // Create artist
    const artist = await Artist.create({
      name,
      email,
      password,
      stageName,
      category,
      phone
    });

    // Create token
    const token = artist.getSignedJwtToken();

    // Remove password from response
    artist.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Artist registered successfully',
      token,
      artist
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Login artist
// @route   POST /api/artists/auth/login
// @access  Public
export const loginArtist = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for artist
    const artist = await Artist.findOne({ email }).select('+password');
    if (!artist) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await artist.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    artist.lastLogin = Date.now();
    await artist.save();

    // Create token
    const token = artist.getSignedJwtToken();

    // Remove password from response
    artist.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      artist
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get current logged in artist
// @route   GET /api/artists/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const artist = await Artist.findById(req.artist._id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    res.status(200).json({
      success: true,
      data: artist
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update artist profile
// @route   PUT /api/artists/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // Don't allow password update here
    
    // Handle socialLinks if sent as string
    if (updates.socialLinks && typeof updates.socialLinks === 'string') {
      try {
        updates.socialLinks = JSON.parse(updates.socialLinks);
      } catch (error) {
        console.error('Error parsing socialLinks:', error);
        delete updates.socialLinks;
      }
    }

    // Handle address if sent as string
    if (updates.address && typeof updates.address === 'string') {
      try {
        updates.address = JSON.parse(updates.address);
      } catch (error) {
        console.error('Error parsing address:', error);
        delete updates.address;
      }
    }

    // Upload profile image if exists
    if (req.files && req.files.profileImage) {
      try {
        const file = req.files.profileImage[0];
        const result = await uploadToCloudinary(
          file.buffer,
          'artists/profile',
          {
            width: 500,
            height: 500,
            crop: 'fill',
            quality: 'auto',
            format: 'webp'
          }
        );
        updates.profileImage = result.secure_url;
      } catch (error) {
        console.error('Error uploading profile image:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile image'
        });
      }
    }

    // Upload gallery images if exist
    if (req.files && req.files.gallery) {
      const galleryUrls = [];
      try {
        for (const file of req.files.gallery) {
          const result = await uploadToCloudinary(
            file.buffer,
            'artists/gallery',
            {
              quality: 'auto',
              format: 'webp'
            }
          );
          galleryUrls.push(result.secure_url);
        }
        
        // Merge with existing gallery
        const existingArtist = await Artist.findById(req.artist._id);
        if (existingArtist && existingArtist.gallery) {
          updates.gallery = [...existingArtist.gallery, ...galleryUrls];
        } else {
          updates.gallery = galleryUrls;
        }
      } catch (error) {
        console.error('Error uploading gallery images:', error);
      }
    }

    // Check if profile is complete
    const requiredFields = ['name', 'email', 'category', 'bio', 'phone', 'profileImage'];
    const artist = await Artist.findById(req.artist._id);
    const isProfileComplete = requiredFields.every(field => {
      if (field === 'profileImage') return updates.profileImage || artist.profileImage;
      return updates[field] !== undefined ? updates[field] : artist[field];
    });
    
    updates.profileComplete = isProfileComplete;

    const updatedArtist = await Artist.findByIdAndUpdate(
      req.artist._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedArtist
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Get all artists (public)
// @route   GET /api/artists
// @access  Public
export const getAllArtists = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      city,
      search,
      verified,
      featured,
      minRating = 0,
      maxRate,
      experience,
      availability,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (city && city !== 'all') {
      filter['address.city'] = new RegExp(city, 'i');
    }
    
    if (verified && verified !== 'all') {
      filter.verified = verified === 'true';
    }
    
    if (featured && featured !== 'all') {
      filter.featured = featured === 'true';
    }
    
    if (experience && experience !== 'all') {
      filter.experience = experience;
    }
    
    if (availability && availability !== 'all') {
      filter.availability = availability;
    }
    
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }
    
    if (maxRate) {
      filter.hourlyRate = { $lte: parseFloat(maxRate) };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { stageName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { genre: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort
    let sort = {};
    if (sortBy === 'rating') {
      sort.rating = order === 'desc' ? -1 : 1;
    } else if (sortBy === 'hourlyRate') {
      sort.hourlyRate = order === 'desc' ? -1 : 1;
    } else {
      sort[sortBy] = order === 'desc' ? -1 : 1;
    }

    // Get artists with pagination
    const artists = await Artist.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Artist.countDocuments(filter);

    // Get aggregations for filters
    const categories = await Artist.distinct('category');
    const cities = await Artist.distinct('address.city');
    const experiences = await Artist.distinct('experience');
    const availabilities = await Artist.distinct('availability');

    res.status(200).json({
      success: true,
      count: artists.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: page > 1
      },
      filters: {
        categories: ['all', ...categories.filter(Boolean)],
        cities: ['all', ...cities.filter(Boolean)],
        experiences: ['all', ...experiences.filter(Boolean)],
        availabilities: ['all', ...availabilities.filter(Boolean)]
      },
      data: artists
    });
  } catch (error) {
    console.error('Get all artists error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch artists'
    });
  }
};

// @desc    Get single artist by ID
// @route   GET /api/artists/:id
// @access  Public
export const getArtistById = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken');
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Increment view count
    artist.views += 1;
    await artist.save();

    res.status(200).json({
      success: true,
      data: artist
    });
  } catch (error) {
    console.error('Get artist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch artist'
    });
  }
};

// @desc    Update artist (owner only)
// @route   PUT /api/artists/:id
// @access  Private
export const updateArtist = async (req, res) => {
  try {
    let artist = await Artist.findById(req.params.id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Check ownership - artist can only update their own profile
    if (artist._id.toString() !== req.artist._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const updates = { ...req.body };
    delete updates.password; // Don't allow password update here

    // Upload profile image if exists
    if (req.files && req.files.profileImage) {
      try {
        // Delete old image if exists
        if (artist.profileImage) {
          const publicId = getPublicIdFromUrl(artist.profileImage);
          if (publicId) {
            await deleteFromCloudinary(publicId);
          }
        }

        const file = req.files.profileImage[0];
        const result = await uploadToCloudinary(
          file.buffer,
          'artists/profile',
          {
            width: 500,
            height: 500,
            crop: 'fill'
          }
        );
        updates.profileImage = result.secure_url;
      } catch (error) {
        console.error('Error uploading profile image:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile image'
        });
      }
    }

    // Handle gallery uploads
    if (req.files && req.files.gallery) {
      const galleryUrls = [];
      try {
        for (const file of req.files.gallery) {
          const result = await uploadToCloudinary(
            file.buffer,
            'artists/gallery',
            {
              quality: 'auto',
              format: 'webp'
            }
          );
          galleryUrls.push(result.secure_url);
        }
        
        // Merge with existing gallery
        if (artist.gallery) {
          updates.gallery = [...artist.gallery, ...galleryUrls];
        } else {
          updates.gallery = galleryUrls;
        }
      } catch (error) {
        console.error('Error uploading gallery images:', error);
      }
    }

    artist = await Artist.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: artist
    });
  } catch (error) {
    console.error('Update artist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Delete artist (owner only)
// @route   DELETE /api/artists/:id
// @access  Private
export const deleteArtist = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Check ownership - artist can only delete their own profile
    if (artist._id.toString() !== req.artist._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own profile'
      });
    }

    // Delete images from Cloudinary
    if (artist.profileImage) {
      const publicId = getPublicIdFromUrl(artist.profileImage);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    if (artist.gallery && artist.gallery.length > 0) {
      for (const imageUrl of artist.gallery) {
        const publicId = getPublicIdFromUrl(imageUrl);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }
    }

    await artist.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Artist profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete artist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete profile'
    });
  }
};

// @desc    Delete gallery image (owner only)
// @route   DELETE /api/artists/:id/gallery/:imageUrl
// @access  Private
export const deleteGalleryImage = async (req, res) => {
  try {
    const { id, imageUrl } = req.params;
    
    const artist = await Artist.findById(id);
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Check ownership
    if (artist._id.toString() !== req.artist._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete images from your own gallery'
      });
    }

    // Delete from Cloudinary
    const publicId = getPublicIdFromUrl(imageUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    // Remove image from gallery array
    artist.gallery = artist.gallery.filter(img => img !== imageUrl);
    await artist.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: artist
    });
  } catch (error) {
    console.error('Delete gallery image error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image'
    });
  }
};

// @desc    Toggle artist verification (remove if not needed)
// @route   PATCH /api/artists/:id/verify
// @access  Private
export const toggleVerification = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    artist.verified = !artist.verified;
    await artist.save();

    res.status(200).json({
      success: true,
      message: `Artist ${artist.verified ? 'verified' : 'unverified'} successfully`,
      data: artist
    });
  } catch (error) {
    console.error('Toggle verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle verification'
    });
  }
};

// @desc    Toggle artist featured (remove if not needed)
// @route   PATCH /api/artists/:id/feature
// @access  Private
export const toggleFeatured = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    artist.featured = !artist.featured;
    await artist.save();

    res.status(200).json({
      success: true,
      message: `Artist ${artist.featured ? 'featured' : 'unfeatured'} successfully`,
      data: artist
    });
  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle featured status'
    });
  }
};

// @desc    Change password
// @route   PUT /api/artists/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const artist = await Artist.findById(req.artist._id).select('+password');
    
    // Check current password
    const isMatch = await artist.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    artist.password = newPassword;
    await artist.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/artists/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const artist = await Artist.findOne({ email });
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'No artist found with this email'
      });
    }

    // Generate reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    artist.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    artist.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await artist.save();

    // TODO: Send email with reset token
    const resetUrl = `${req.protocol}://${req.get('host')}/api/artists/auth/reset-password/${resetToken}`;

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      resetToken // In production, remove this and send email
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process forgot password'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/artists/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const crypto = await import('crypto');
    
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const artist = await Artist.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!artist) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    artist.password = req.body.password;
    artist.resetPasswordToken = undefined;
    artist.resetPasswordExpire = undefined;
    await artist.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
};

// @desc    Get artist stats
// @route   GET /api/artists/stats/overview
// @access  Private
export const getArtistStats = async (req, res) => {
  try {
    const artist = await Artist.findById(req.artist._id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Calculate profile completion percentage
    const requiredFields = [
      'name', 'email', 'category', 'bio', 'phone', 
      'profileImage', 'hourlyRate', 'address.city'
    ];
    
    let completedFields = 0;
    requiredFields.forEach(field => {
      if (field === 'profileImage') {
        if (artist.profileImage) completedFields++;
      } else if (artist[field]) {
        completedFields++;
      }
    });
    
    const profileCompletion = Math.round((completedFields / requiredFields.length) * 100);

    const stats = {
      profileCompletion,
      views: artist.views || 0,
      bookings: artist.bookings || 0,
      rating: artist.rating || 0,
      totalReviews: artist.totalReviews || 0,
      galleryCount: artist.gallery ? artist.gallery.length : 0,
      verified: artist.verified,
      featured: artist.featured,
      joinedDate: artist.createdAt
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get artist stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get artist stats'
    });
  }
};
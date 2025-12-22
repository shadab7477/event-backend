// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import Artist from '../models/Artist.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
console.log(token);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get artist from token
    const artist = await Artist.findById(decoded.id).select('-password');
    
    if (!artist) {
      return res.status(401).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Add artist to request
    req.artist = artist;
    req.artistId = artist._id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin authorization middleware
export const authorize = (req, res, next) => {
  // Check if user is admin
  // You can implement your admin check logic here
  // For now, we'll check if the user has admin role or is a specific admin user
  
  if (!req.artist) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  // Option 1: Check for admin role in artist model
  // You need to add a 'role' field to your Artist model
  // if (req.artist.role !== 'admin') {
  //   return res.status(403).json({
  //     success: false,
  //     message: 'Not authorized to access this route'
  //   });
  // }

  // Option 2: Check specific admin emails (temporary solution)
  const adminEmails = ['admin@example.com', 'superadmin@example.com']; // Add your admin emails
  if (!adminEmails.includes(req.artist.email)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this route. Admin access only.'
    });
  }

  next();
};

// Combined protect and authorize middleware
export const protectAndAuthorize = async (req, res, next) => {
  try {
    await protect(req, res, async () => {
      authorize(req, res, next);
    });
  } catch (error) {
    next(error);
  }
};

// Optional auth - user can be logged in or not
export const optionalAuth = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.artist = null;
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get artist from token
    const artist = await Artist.findById(decoded.id).select('-password');
    
    if (artist) {
      req.artist = artist;
    } else {
      req.artist = null;
    }
  } catch (error) {
    req.artist = null;
  }

  next();
};

// Check if user owns the resource
export const checkOwnership = (req, res, next) => {
  const artistId = req.params.id;
  
  if (req.artist._id.toString() !== artistId) {
    return res.status(403).json({
      success: false,
      message: 'You can only modify your own profile'
    });
  }
  
  next();
};
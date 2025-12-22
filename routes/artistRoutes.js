// routes/artists.js
import express from 'express';
import multer from 'multer';
import {
  registerArtist,
  loginArtist,
  getMe,
  updateProfile,
  getAllArtists,
  getArtistById,
  updateArtist,
  deleteArtist,
  deleteGalleryImage,
  toggleVerification,
  toggleFeatured,
  changePassword,
  forgotPassword,
  resetPassword,
  getArtistStats
} from '../controllers/artistController.js';
import { protect, optionalAuth, checkOwnership } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
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

// ===== PUBLIC ROUTES =====
router.post('/auth/register', registerArtist);
router.post('/auth/login', loginArtist);
router.post('/auth/forgot-password', forgotPassword);
router.put('/auth/reset-password/:resetToken', resetPassword);
router.get('/', optionalAuth, getAllArtists);
router.get('/:id', optionalAuth, getArtistById);

// ===== PROTECTED ROUTES (Artist only) =====
router.use(protect);

// Artist's own profile
router.get('/auth/me', getMe);
router.put('/auth/update-profile', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), updateProfile);
router.put('/auth/change-password', changePassword);
router.get('/stats/overview', getArtistStats);

// Artist CRUD (artist can only update/delete their own profile)
router.put('/:id', checkOwnership, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), updateArtist);
router.delete('/:id', checkOwnership, deleteArtist);
router.delete('/:id/gallery/:imageUrl', checkOwnership, deleteGalleryImage);

// Optional admin functions (remove if not needed)
// router.patch('/:id/verify', toggleVerification);
// router.patch('/:id/feature', toggleFeatured);

export default router;
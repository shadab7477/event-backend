import express from "express";
import { uploadBlogContent } from '../config/cloudinary.js';

const router = express.Router();

// Upload image endpoint for blog content (Tiptap editor)
router.post("/", uploadBlogContent.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    res.json({
      message: "Image uploaded successfully",
      imageUrl: req.file.path,
      publicId: req.file.filename
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ 
      message: "Error uploading image", 
      error: error.message 
    });
  }
});

export default router;
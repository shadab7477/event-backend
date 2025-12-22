// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import userMiddleware from "../middleware/userMiddleware.js";
import { sendSmsOtp } from "../utils/smsService.js";

const router = express.Router();

// Generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if phone exists
router.post("/check-phone", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Check if user exists with this phone
    const existingUser = await User.findOne({ phone });

    res.status(200).json({
      exists: !!existingUser,
      message: existingUser ? "Phone number exists" : "Phone number not found"
    });
  } catch (error) {
    console.error("Check Phone Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send OTP for login (only for existing users)
router.post("/send-login-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    console.log("Login OTP requested for:", phone);

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Check if user exists with this phone
    const existingUser = await User.findOne({ phone });

    if (!existingUser) {
      return res.status(404).json({ 
        message: "Phone number not registered. Please sign up first." 
      });
    }

    // Check if OTP was sent recently (prevent spam)
    const recentOtpUser = await User.findOne({ 
      phone, 
      lastOtpSent: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes cooldown
    });

    if (recentOtpUser) {
      return res.status(429).json({ 
        message: "Please wait before requesting another OTP" 
      });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update OTP details
    await User.findOneAndUpdate(
      { phone },
      { 
        otp, 
        otpExpires, 
        lastOtpSent: new Date()
      }
    );

    // Send OTP via SMS
    const smsSent = await sendSmsOtp(phone, otp);
    
    if (!smsSent.success) {
      return res.status(500).json({ message: "Failed to send OTP via SMS" });
    }

    res.status(200).json({ 
      message: "OTP sent successfully to your registered phone number",
      phone: phone 
    });
  } catch (error) {
    console.error("Send Login OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send OTP for signup (for new users with all data)
router.post("/send-signup-otp", async (req, res) => {
  try {
    const { phone, name, email, city, age, gender } = req.body;
    console.log("Signup OTP requested with data:", { phone, name, email, city, age, gender });

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Validate all required fields
    if (!name || !email || !city || !age || !gender) {
      return res.status(400).json({ 
        message: "All fields (name, email, city, age, gender) are required for signup" 
      });
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
      return res.status(400).json({ 
        message: "Age must be a number between 16 and 100" 
      });
    }

    // Check if user already exists with full registration
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.name && existingUser.isVerified) {
      return res.status(400).json({ 
        message: "Phone number already registered. Please login instead." 
      });
    }

    // Check if OTP was sent recently (prevent spam)
    const recentOtpUser = await User.findOne({ 
      phone, 
      lastOtpSent: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes cooldown
    });

    if (recentOtpUser) {
      return res.status(429).json({ 
        message: "Please wait before requesting another OTP" 
      });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store user data temporarily with OTP (update if partial user exists)
    await User.findOneAndUpdate(
      { phone },
      { 
        name,
        email,
        city,
        age: ageNum.toString(),
        gender,
        otp, 
        otpExpires, 
        lastOtpSent: new Date(),
        isVerified: false,
        status: 'Pending'
      },
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true 
      }
    );

    // Send OTP via SMS
    const smsSent = await sendSmsOtp(phone, otp);
    
    if (!smsSent.success) {
      return res.status(500).json({ message: "Failed to send OTP via SMS" });
    }

    res.status(200).json({ 
      success: true,
      message: "OTP sent successfully for verification",
      phone: phone 
    });
  } catch (error) {
    console.error("Send Signup OTP Error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: "Email address already registered with another account" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error during signup" 
    });
  }
});

// Verify OTP for login (only for existing users)
router.post("/verify-login-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    // Find user with matching OTP
    const user = await User.findOne({ 
      phone, 
      otp,
      otpExpires: { $gt: new Date() } // OTP not expired
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired OTP" 
      });
    }

    // Check if user is fully registered
    if (!user.name || !user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: "Account not fully registered. Please complete signup." 
      });
    }

    // Update user - remove OTP and mark as verified
    user.otp = null;
    user.otpExpires = null;
    user.isVerified = true;
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1000d",
    });

    // Return user info
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.error("Verify Login OTP Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Verify OTP for signup and complete registration
router.post("/verify-signup-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ 
        success: false,
        message: "Phone and OTP are required" 
      });
    }

    // Find user with matching OTP
    const user = await User.findOne({ 
      phone, 
      otp,
      otpExpires: { $gt: new Date() } // OTP not expired
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired OTP" 
      });
    }

    // Check if all required fields are present
    if (!user.name || !user.email || !user.city || !user.age || !user.gender) {
      return res.status(400).json({ 
        success: false,
        message: "Incomplete registration data. Please restart signup." 
      });
    }

    // Complete user registration
    user.otp = null;
    user.otpExpires = null;
    user.isVerified = true;
    user.status = 'Complete';
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1000d",
    });

    // Return user info
    res.status(200).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.error("Verify Signup OTP Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Resend OTP for login
router.post("/resend-login-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (!existingUser) {
      return res.status(404).json({ 
        success: false,
        message: "Phone number not registered" 
      });
    }

    // Check if OTP was sent recently
    const recentOtpUser = await User.findOne({ 
      phone, 
      lastOtpSent: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes cooldown
    });

    if (recentOtpUser) {
      return res.status(429).json({ 
        success: false,
        message: "Please wait before requesting another OTP" 
      });
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update OTP details
    await User.findOneAndUpdate(
      { phone },
      { 
        otp, 
        otpExpires, 
        lastOtpSent: new Date() 
      }
    );

    // Send OTP via SMS
    const smsSent = await sendSmsOtp(phone, otp);
    
    if (!smsSent.success) {
      return res.status(500).json({ 
        success: false,
        message: "Failed to send OTP via SMS" 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "OTP resent successfully" 
    });
  } catch (error) {
    console.error("Resend Login OTP Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Resend OTP for signup
router.post("/resend-signup-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false,
        message: "Phone number is required" 
      });
    }

    // Check if user already exists with full registration
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.name && existingUser.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: "Phone number already registered. Please login instead." 
      });
    }

    // Check if OTP was sent recently
    const recentOtpUser = await User.findOne({ 
      phone, 
      lastOtpSent: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes cooldown
    });

    if (recentOtpUser) {
      return res.status(429).json({ 
        success: false,
        message: "Please wait before requesting another OTP" 
      });
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update OTP details (preserve any existing partial data)
    await User.findOneAndUpdate(
      { phone },
      { 
        otp, 
        otpExpires, 
        lastOtpSent: new Date() 
      }
    );

    // Send OTP via SMS
    const smsSent = await sendSmsOtp(phone, otp);
    
    if (!smsSent.success) {
      return res.status(500).json({ 
        success: false,
        message: "Failed to send OTP via SMS" 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "OTP resent successfully" 
    });
  } catch (error) {
    console.error("Resend Signup OTP Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Edit Profile
router.put('/edit-profile', userMiddleware, async (req, res) => {
    try {
        const { name, email, phone, city, age, gender } = req.body;
        const userId = req.user.id;

        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
              success: false,
              message: "User not found" 
            });
        }

        // Update user fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (city) user.city = city;
        if (age) {
          const ageNum = parseInt(age);
          if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
            return res.status(400).json({ 
              success: false,
              message: "Age must be between 16 and 100" 
            });
          }
          user.age = ageNum.toString();
        }
        if (gender) user.gender = gender;

        // Save updated user
        await user.save();

        // Return updated user info
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              city: user.city,
              age: user.age,
              gender: user.gender,
            }
        });
    } catch (error) {
        console.error("Profile update error:", error);
        
        // Handle duplicate email error
        if (error.code === 11000) {
          return res.status(400).json({ 
            success: false,
            message: "Email address already in use" 
          });
        }
        
        res.status(500).json({ 
          success: false,
          message: "Error updating profile" 
        });
    }
});

// Get User Data
router.get('/get-user', userMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
              success: false,
              message: "User not found" 
            });
        }

        // Return user info
        res.status(200).json({
            success: true,
            message: "User data retrieved successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                city: user.city,
                age: user.age,
                gender: user.gender,
            }
        });
    } catch (error) {
        console.error("User data retrieval error:", error);
        res.status(500).json({ 
          success: false,
          message: "Error retrieving user data" 
        });
    }
});

// Get user by ID (admin or self)
router.get('/user/:id', userMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.user.id;

    // Check if requesting user is admin or requesting their own data
    const requestingUser = await User.findById(requestingUserId);
    const isAdmin = requestingUser.role === 'admin';
    const isSelf = userId === requestingUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        age: user.age,
        gender: user.gender,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Cleanup expired OTPs
const cleanupExpiredOtps = async () => {
  try {
    const result = await User.updateMany(
      {
        otpExpires: { $lt: new Date() }
      },
      {
        $set: {
          otp: null,
          otpExpires: null
        }
      }
    );
    console.log(`Cleaned up expired OTPs for ${result.modifiedCount} users`);
  } catch (error) {
    console.error("Cleanup Error:", error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredOtps, 60 * 60 * 1000);

export default router;
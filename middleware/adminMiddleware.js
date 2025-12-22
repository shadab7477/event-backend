// middleware/adminMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const adminMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      message: "Access denied. No token provided." 
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure token is for admin
    if (decoded.username !== process.env.FIXED_USERNAME) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Not an admin." 
      });
    }

    req.admin = decoded; // Store admin info in request
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: "Invalid token" 
    });
  }
};

export default adminMiddleware;
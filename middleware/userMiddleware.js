import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1]; // Get token from headers

    if (!token) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
console.log(decoded);

    req.user = await User.findById(decoded.id).select("-password"); // Attach user to request

    if (!req.user) {
      return res.status(401).json({ message: "User not found, authorization denied" });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token, authorization denied" });
  }
};

export default authMiddleware;

import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import adminMiddleware from "../middleware/adminMiddleware.js";
import User from "../models/User.js";
dotenv.config();

const router = express.Router();

// Fixed credentials
const FIXED_USERNAME = process.env.FIXED_USERNAME;
const FIXED_PASSWORD = process.env.FIXED_PASSWORD;

// Login route
router.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
        // Generate a token
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "10000h" });

        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});






export default router;

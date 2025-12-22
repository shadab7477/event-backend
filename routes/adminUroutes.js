import express from "express";
import { getAllUsers, updateUserStatus, updateUserRemark } from "../controllers/adminUsercontroller.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Admin Routes
router.get("/users", adminMiddleware, getAllUsers);
router.put("/users/:id/status", adminMiddleware, updateUserStatus);
router.put("/users/:id/remark", adminMiddleware, updateUserRemark);

export default router;

import bcrypt from "bcryptjs";
import User from "../models/User.js"; // Adjust according to your user model

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    const userId = req.user._id; // Assuming user is authenticated

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

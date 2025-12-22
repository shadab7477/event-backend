import User from "../models/User.js";

// Get All Users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude passwords
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Status (Admin Only)
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["Pending", "Complete"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = status;
    await user.save();

    res.status(200).json({ message: "Status updated successfully", user });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Remark (Admin Only)
export const updateUserRemark = async (req, res) => {
  try {
    const { remark } = req.body;
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.remark = remark;
    await user.save();

    res.status(200).json({ message: "Remark updated successfully", user });
  } catch (error) {
    console.error("Error updating remark:", error);
    res.status(500).json({ message: "Server error" });
  }
};

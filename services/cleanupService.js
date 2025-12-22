// services/cleanupService.js
import User from "../models/User.js";

export const startCleanupService = () => {
  const cleanupExpiredOtps = async () => {
    try {
      const result = await User.deleteMany({
        isVerified: false,
        otpExpires: { $lt: new Date() }
      });
      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} expired OTP records`);
      }
    } catch (error) {
      console.error("Cleanup Error:", error);
    }
  };

  // Run cleanup every hour
  setInterval(cleanupExpiredOtps, 60 * 60 * 1000);
  
  // Run immediately on startup
  cleanupExpiredOtps();
  
  console.log('Cleanup service started');
};
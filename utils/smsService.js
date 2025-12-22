// utils/smsService.js
import axios from "axios";

const SMS_CONFIG = {
  authKey: "3237656e63656738303394",
  sender: "CLGFOM",
  route: "2",
  DLT_TE_ID: "1707176137809504396"
};

export const sendSmsOtp = async (mobile, otp) => {
  try {
    const { authKey, sender, route, DLT_TE_ID } = SMS_CONFIG;
    
    const message = `Thanks for verifying your number! Use OTP ${otp} to unlock exclusive discounts on your college Applications. Valid for 15 minutes only. www.collegeforms.in`;

    const url = `http://control.yourbulksms.com/api/sendhttp.php?authkey=${authKey}&mobiles=${mobile}&sender=${sender}&route=${route}&country=0&DLT_TE_ID=${DLT_TE_ID}&message=${encodeURIComponent(message)}`;

    const { data } = await axios.get(url);
    console.log("✅ SMS API Response:", data);
    console.log("📲 OTP sent to", mobile, ":", otp);
    
    return { success: true, data };
  } catch (err) {
    console.error("❌ Error sending SMS OTP:", err.message);
    return { success: false, error: err.message };
  }
};
import axios from "axios";

const sendOtp = async () => {
  const authKey = "3237656e63656738303394";
  const mobile = "9399329642";
  const sender = "CLGFOM"; // 🔹 Approved DLT Header
  const route = "2"; // transactional route
  const DLT_TE_ID = "1707176137809504396"; // 🔹 Your approved OTP template ID
  const otp = Math.floor(100000 + Math.random() * 900000);
  const message = `Thanks for verifying your number! Use OTP ${otp} to unlock exclusive discounts on your college Applications. Valid for 15 minutes only. www.collegeforms.in`; // exact DLT message

  const url = `http://control.yourbulksms.com/api/sendhttp.php?authkey=${authKey}&mobiles=${mobile}&sender=${sender}&route=${route}&country=0&DLT_TE_ID=${DLT_TE_ID}&message=${encodeURIComponent(message)}`;

  try {
    const { data } = await axios.get(url);
    console.log("✅ API Response:", data);
    console.log("📲 OTP:", otp);
  } catch (err) {
    console.error("❌ Error sending OTP:", err.message);
  }
};

sendOtp();

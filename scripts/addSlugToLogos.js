// scripts/addSlugToLogos.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Logo from "../models/logo.js";
import College from "../models/College.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

const addSlugToExistingLogos = async () => {
  try {
    const logos = await Logo.find();
    console.log(`Found ${logos.length} logos.`);

    for (const logo of logos) {
      // Skip if slug already exists
      if (logo.slug) {
        console.log(`Skipping logo ${logo._id} (slug already exists).`);
        continue;
      }

      // Find the corresponding college
      const college = await College.findById(logo.collegeId);

      if (!college) {
        console.log(`⚠️ College not found for logo ${logo._id}`);
        continue;
      }

      // Update the logo with the slug
      logo.slug = college.slug;
      await logo.save();

      console.log(`✅ Added slug "${college.slug}" to logo ${logo._id}`);
    }

    console.log("🎉 All logos processed successfully!");
  } catch (error) {
    console.error("❌ Error while adding slugs:", error.message);
  } finally {
    mongoose.connection.close();
  }
};

// Run script
await connectDB();
await addSlugToExistingLogos();

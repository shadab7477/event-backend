// scripts/fix-student-indexes.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixStudentIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    const studentsCollection = mongoose.connection.db.collection("students");

    // Check existing indexes
    const indexes = await studentsCollection.indexes();
    console.log("Indexes before:", indexes);

    // Drop the wrong index if it exists
    try {
      await studentsCollection.dropIndex("collegeStatuses.applicationId_1");
      console.log("🗑️ Dropped index collegeStatuses.applicationId_1");
    } catch (err) {
      if (err.codeName === "IndexNotFound") {
        console.log("ℹ️ Index not found, nothing to drop");
      } else {
        console.error("❌ Error dropping index:", err);
      }
    }

    // Ensure correct index on applicationId
    await studentsCollection.createIndex(
      { applicationId: 1 },
      { unique: true }
    );

    console.log("✅ Fixed indexes successfully");

    // Show final indexes
    const updatedIndexes = await studentsCollection.indexes();
    console.log("Indexes after:", updatedIndexes);
  } catch (err) {
    console.error("❌ Index fix error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

fixStudentIndexes();

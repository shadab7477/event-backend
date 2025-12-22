import mongoose from 'mongoose';
import College from '../models/College.js'; // Adjust path as needed
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to generate new slug from name and location
const generateSlug = (name, location) => {
  if (!name || !location) return '';
  
  const nameSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const locationSlug = location
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${nameSlug}-${locationSlug}`;
};

const updateCollegeSlugs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://techshad04:VXnZ4BgWDH4yfPnh@college.hdoqr.mongodb.net/?retryWrites=true&w=majority&appName=College' || 'mongodb://localhost:27017/your-database-name');
    console.log('mongodb+srv://techshad04:VXnZ4BgWDH4yfPnh@college.hdoqr.mongodb.net/?retryWrites=true&w=majority&appName=College');
    
    console.log('Connected to MongoDB');

    // Get all colleges
    const colleges = await College.find({});
    console.log(`Found ${colleges.length} colleges to update`);

    let updatedCount = 0;
    let errorCount = 0;
    const skippedColleges = [];

    // Update each college
    for (const college of colleges) {
      try {
        // Generate new slug
        const newSlug = generateSlug(college.name, college.location);
        
        if (!newSlug) {
          console.log(`❌ Skipping college "${college.name}" - could not generate slug`);
          skippedColleges.push({
            name: college.name,
            reason: 'Could not generate slug'
          });
          continue;
        }

        // Check if the new slug already exists (excluding current college)
        const existingCollege = await College.findOne({ 
          slug: newSlug, 
          _id: { $ne: college._id } 
        });

        if (existingCollege) {
          console.log(`⚠️  Skipping "${college.name}" - slug "${newSlug}" already exists for "${existingCollege.name}"`);
          skippedColleges.push({
            name: college.name,
            reason: `Slug conflict with "${existingCollege.name}"`
          });
          continue;
        }

        // Update the college with new slug
        college.slug = newSlug;
        await college.save();
        
        console.log(`✅ Updated "${college.name}": ${college._id} -> ${newSlug}`);
        updatedCount++;

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error updating college "${college.name}":`, error.message);
        errorCount++;
        skippedColleges.push({
          name: college.name,
          reason: `Error: ${error.message}`
        });
      }
    }

    // Print summary
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total colleges processed: ${colleges.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped: ${skippedColleges.length}`);

    if (skippedColleges.length > 0) {
      console.log('\n=== SKIPPED COLLEGES ===');
      skippedColleges.forEach((college, index) => {
        console.log(`${index + 1}. ${college.name} - ${college.reason}`);
      });
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the migration
updateCollegeSlugs();
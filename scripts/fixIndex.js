// scripts/fixIndex.js
import mongoose from 'mongoose';
import User from '../models/User.js';

async function fixEmailIndex() {
    try {
        await mongoose.connect('mongodb+srv://techshad04:VXnZ4BgWDH4yfPnh@college.hdoqr.mongodb.net/?retryWrites=true&w=majority&appName=College');
        console.log('Connected to MongoDB for index fix...');

        // Get current indexes
        console.log('Current indexes before:');
        const indexesBefore = await User.collection.getIndexes();
        console.log(Object.keys(indexesBefore));

        // Try to drop the email index
        try {
            await User.collection.dropIndex("email_1");
            console.log('✅ Successfully dropped old email index');
        } catch (dropError) {
            console.log('ℹ️  Index already dropped or not found:', dropError.message);
        }

        // Recreate the index with sparse option
        await User.collection.createIndex({ email: 1 }, { 
            unique: true, 
            sparse: true,
            name: "email_1" 
        });
        console.log('✅ Successfully created sparse email index');

        // Verify the new index
        console.log('Current indexes after:');
        const indexesAfter = await User.collection.getIndexes();
        console.log('Indexes:', Object.keys(indexesAfter));
        
        // Check if email index has sparse: true
        const emailIndex = indexesAfter.email_1;
        if (emailIndex) {
            console.log('✅ Email index details:', {
                name: emailIndex.name,
                key: emailIndex.key,
                sparse: emailIndex.sparse,
                unique: emailIndex.unique
            });
        }

        await mongoose.disconnect();
        console.log('✅ Index fix completed successfully');
    } catch (error) {
        console.error('❌ Error fixing index:', error);
        process.exit(1);
    }
}

fixEmailIndex();
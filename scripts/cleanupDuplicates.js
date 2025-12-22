// scripts/cleanupDuplicates.js
import mongoose from 'mongoose';
import User from '../models/User.js';

async function cleanupDuplicateNullEmails() {
    try {
        // Connect to your database
        await mongoose.connect('mongodb+srv://techshad04:VXnZ4BgWDH4yfPnh@college.hdoqr.mongodb.net/?retryWrites=true&w=majority&appName=College');
        console.log('Connected to MongoDB for cleanup...');

        // Find all users with null email
        const usersWithNullEmail = await User.find({ email: null }).sort({ createdAt: 1 });
        
        console.log(`Found ${usersWithNullEmail.length} users with null email`);

        if (usersWithNullEmail.length > 1) {
            // Keep the oldest user, delete the rest
            const userToKeep = usersWithNullEmail[0];
            const usersToDelete = usersWithNullEmail.slice(1);
            
            console.log(`Keeping user with phone: ${userToKeep.phone} (created at: ${userToKeep.createdAt})`);
            
            for (const user of usersToDelete) {
                await User.findByIdAndDelete(user._id);
                console.log(`Deleted duplicate user with phone: ${user.phone}`);
            }
            
            console.log(`Cleaned up ${usersToDelete.length} duplicate null email users`);
        } else if (usersWithNullEmail.length === 1) {
            console.log('Only one user with null email - no cleanup needed');
        } else {
            console.log('No users with null email found');
        }

        await mongoose.disconnect();
        console.log('Cleanup completed successfully');
    } catch (error) {
        console.error('Cleanup error:', error);
        process.exit(1);
    }
}

cleanupDuplicateNullEmails();
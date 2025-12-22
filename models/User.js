// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        sparse: true,
        unique: true,
        lowercase: true,
        trim: true,
        default: null
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    city: {
        type: String,
        required: false,
        trim: true
    },
    age: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Complete', 'Pending'],
        default: 'Pending',
    },
    remark: { 
        type: String, 
        default: "" 
    },
    // OTP verification fields
    otp: {
        type: String,
        default: null
    },
    otpExpires: {
        type: Date,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastOtpSent: {
        type: Date,
        default: null
    }
}, { 
    timestamps: true 
});

// Explicitly define the sparse index
userSchema.index({ email: 1 }, { sparse: true, unique: true });

const User = mongoose.model('User', userSchema);

// Function to recreate indexes
export async function recreateUserIndexes() {
    try {
        await User.collection.dropIndex("email_1");
        console.log('Dropped old email index');
    } catch (error) {
        console.log('Old email index already dropped or not found');
    }
    
    try {
        await User.createIndexes();
        console.log('User indexes recreated successfully');
        
        // Verify the index was created correctly
        const indexes = await User.collection.getIndexes();
        console.log('Current indexes:', Object.keys(indexes));
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

export default User;
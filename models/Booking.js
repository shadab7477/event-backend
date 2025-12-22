import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  // Booking Info
  bookingId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Event", 
    required: true 
  },
  
  // User Info
  userId: { type: String }, // Optional - can be guest booking
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userPhone: { type: String, required: true },
  
  // Tickets Booked
  tickets: [
    {
      ticketTypeId: { type: String, required: true }, // Reference to ticket type
      ticketTypeName: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      pricePerTicket: { type: Number, required: true },
      seatType: { type: String, enum: ["front", "middle", "back", "general"] },
      seatNumbers: [String], // Specific seat numbers assigned
      isPaid: { type: Boolean, default: false },
      promoCodeUsed: String // If this ticket was booked using a promo code
    }
  ],
  
  // Payment Info
  subtotalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  
  // Promo Code Used
  promoCode: {
    code: String,
    discountType: String,
    discountValue: Number,
    discountApplied: Number
  },
  
  // Payment Details
  paymentMethod: { 
    type: String, 
    enum: ["cash", "card", "upi", "netbanking", "wallet", "free"], 
    default: "cash" 
  },
  paymentStatus: { 
    type: String, 
    enum: ["pending", "processing", "completed", "failed", "refunded"], 
    default: "pending" 
  },
  paymentId: String,
  paymentDate: Date,
  
  // Booking Status
  bookingStatus: { 
    type: String, 
    enum: ["confirmed", "cancelled", "checked_in", "no_show"], 
    default: "confirmed" 
  },
  
  // Check-in Info
  checkedIn: { type: Boolean, default: false },
  checkInTime: Date,
  checkInBy: String,
  
  // Admin Notes
  adminNotes: String,
  cancellationReason: String,
  
  // Metadata
  bookingSource: { type: String, default: "web" },
  deviceInfo: String,
  ipAddress: String

}, { 
  timestamps: true 
});

// Generate booking ID before saving
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const prefix = 'BOOK';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.bookingId = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Indexes
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ userEmail: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  // Basic Info
  title: { type: String, required: true },
  shortDescription: String,
  fullDescription: String,
  category: String,
  tags: [String],

  // Event Timing
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: Date,

  // Location (Required for maps)
  venueName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  pinCode: String,
  
  // Geo Location (Required for maps)
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(arr) {
          return arr.length === 2 && 
                 arr[0] >= -180 && arr[0] <= 180 && 
                 arr[1] >= -90 && arr[1] <= 90;
        },
        message: 'Invalid coordinates. Must be [longitude, latitude]'
      }
    }
  },

  // Ticket Configuration with Seat Allocation
  ticketTypes: [
    {
      name: { type: String, required: true },
      description: String,
      price: { type: Number, required: true, min: 0 },
      currency: { type: String, default: "INR" },
      totalQuantity: { type: Number, required: true, min: 1 },
      availableQuantity: { type: Number, default: 0 },
      reservedQuantity: { type: Number, default: 0 }, // Tickets reserved during booking process
      soldQuantity: { type: Number, default: 0 },
      maxPerUser: { type: Number, default: 5 },
      isActive: { type: Boolean, default: true },
      saleStartDate: Date,
      saleEndDate: Date,
      seatType: { 
        type: String, 
        enum: ["front", "middle", "back", "general"], 
        default: "general" 
      },
      requiresPromoCode: { type: Boolean, default: false }, // If true, needs promo code to book
      associatedPromoCode: String // If requiresPromoCode is true, this is the code
    }
  ],

  // Promo Codes for free tickets
  promoCodes: [
    {
      code: { 
        type: String, 
        required: true, 
        uppercase: true,
        unique: true 
      },
      discountType: { 
        type: String, 
        enum: ["percentage", "fixed", "free"], 
        required: true 
      },
      discountValue: { 
        type: Number, 
        required: true, 
        min: 0 
      },
      maxUses: { 
        type: Number, 
        default: 100 
      },
      usedCount: { 
        type: Number, 
        default: 0 
      },
      minOrderValue: Number,
      validFrom: { 
        type: Date, 
        required: true 
      },
      validUntil: { 
        type: Date, 
        required: true 
      },
      isActive: { 
        type: Boolean, 
        default: true 
      },
      applicableTicketTypes: [String], // Which ticket types this code works with
      description: String
    }
  ],

  // Admin Reserved Seats
  adminReservations: [
    {
      seatNumber: String, // Format: "Row-Seat" e.g., "A-1", "B-12"
      ticketType: String, // Which ticket type this seat belongs to
      reservedFor: String, // Name of person/organization
      contactEmail: String,
      contactPhone: String,
      isOccupied: { type: Boolean, default: false },
      notes: String,
      reservedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Admin" 
      },
      reservedAt: { type: Date, default: Date.now }
    }
  ],

  // Media
  bannerImage: { type: String, required: true },
  thumbnailImage: { type: String, required: true },
  galleryImages: [String],
  videoUrl: String,

  // Settings
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isSoldOut: { type: Boolean, default: false },
  ageRestriction: { type: Number, min: 0, max: 100 },
  eventType: { 
    type: String, 
    enum: ["conference", "workshop", "seminar", "concert", "festival", "exhibition", "other"], 
    default: "conference" 
  },
  mode: { 
    type: String, 
    enum: ["online", "offline", "hybrid"], 
    default: "offline" 
  },
  language: { type: String, default: "English" },
  dressCode: String,

  // Admin Controls
  createdBy: { 
    type: String, 
    required: true 
  },
  updatedBy: { 
    type: String 
  },

  // Analytics
  totalViews: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalWaitlist: { type: Number, default: 0 },

  // Status
  status: { 
    type: String, 
    enum: ["draft", "published", "cancelled", "completed"], 
    default: "draft" 
  },

  // Seat Map Configuration
  seatingConfig: {
    totalRows: { type: Number, default: 5 },
    seatsPerRow: { type: Number, default: 6 },
    frontRowStart: { type: Number, default: 1 }, // Row numbers for front seats
    frontRowEnd: { type: Number, default: 2 },
    middleRowStart: { type: Number, default: 3 },
    middleRowEnd: { type: Number, default: 3 },
    backRowStart: { type: Number, default: 4 },
    backRowEnd: { type: Number, default: 5 }
  }

}, { 
  timestamps: true 
});

// Index for geospatial queries
eventSchema.index({ geoLocation: "2dsphere" });

// Indexes for better query performance
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ city: 1, state: 1, country: 1 });
eventSchema.index({ status: 1, isPublished: 1 });
eventSchema.index({ "ticketTypes.isActive": 1 });
eventSchema.index({ "promoCodes.code": 1 }, { unique: true, sparse: true });

// Pre-save middleware to calculate available quantity
eventSchema.pre('save', function(next) {
  // Calculate available quantity for each ticket type
  this.ticketTypes.forEach(ticket => {
    ticket.availableQuantity = ticket.totalQuantity - ticket.soldQuantity - ticket.reservedQuantity;
  });

  // Check if event is sold out
  const allTicketsSold = this.ticketTypes.every(ticket => 
    ticket.availableQuantity <= 0
  );
  this.isSoldOut = allTicketsSold;

  next();
});

export default mongoose.model("Event", eventSchema);
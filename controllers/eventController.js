// controllers/eventController.js
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

// Generate seat numbers based on configuration
const generateSeatNumbers = (event, seatType, quantity) => {
  const { seatingConfig } = event;
  const seats = [];
  
  let rowStart, rowEnd;
  
  switch(seatType) {
    case "front":
      rowStart = seatingConfig.frontRowStart;
      rowEnd = seatingConfig.frontRowEnd;
      break;
    case "middle":
      rowStart = seatingConfig.middleRowStart;
      rowEnd = seatingConfig.middleRowEnd;
      break;
    case "back":
      rowStart = seatingConfig.backRowStart;
      rowEnd = seatingConfig.backRowEnd;
      break;
    default:
      rowStart = 1;
      rowEnd = seatingConfig.totalRows;
  }
  
  // Get all booked seats
  const bookedSeats = [];
  event.adminReservations.forEach(res => {
    if (res.isOccupied) bookedSeats.push(res.seatNumber);
  });
  
  // Generate available seats
  for (let row = rowStart; row <= rowEnd && seats.length < quantity; row++) {
    for (let seat = 1; seat <= seatingConfig.seatsPerRow && seats.length < quantity; seat++) {
      const seatNumber = `${String.fromCharCode(64 + row)}-${seat}`;
      if (!bookedSeats.includes(seatNumber)) {
        seats.push(seatNumber);
      }
    }
  }
  
  return seats;
};

// Generate unique promo codes
const generateUniquePromoCodes = (count) => {
  const codes = [];
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      code = '';
      // Generate 8-character code
      for (let j = 0; j < 8; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // Format as XXX-XXX-XX
      code = `${code.substring(0,3)}-${code.substring(3,6)}-${code.substring(6,8)}`;
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Failed to generate unique promo codes');
      }
    } while (codes.includes(code)); // Ensure uniqueness
    
    codes.push(code);
  }
  
  return codes;
};

// @desc    Create new event with seat allocation and unique promo codes
// @route   POST /api/events
// @access  Public (no auth for demo)
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      venueName,
      address,
      city,
      state,
      country,
      longitude,
      latitude,
      startDate,
      endDate,
      paidTicketCount = 15,
      codeTicketCount = 15,
      paidTicketPrice = 0,
      paidTicketSeatType = "front",
      codeTicketSeatType = "back",
      seatingConfig = {
        totalRows: 5,
        seatsPerRow: 6,
        frontRowStart: 1,
        frontRowEnd: 2,
        middleRowStart: 3,
        middleRowEnd: 3,
        backRowStart: 4,
        backRowEnd: 5
      }
    } = req.body;

    // Validate required fields
    if (!title || !venueName || !address || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "Title, venue, address, city, state, and country are required"
      });
    }

    // Validate geo location
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required for mapping"
      });
    }

    // Generate unique promo codes for free tickets
    const freePromoCodes = generateUniquePromoCodes(parseInt(codeTicketCount) || 15);

    // Create ticket types based on configuration
    const ticketTypes = [
      {
        name: "Paid Ticket",
        description: "Regular paid ticket with front row seating",
        price: parseFloat(paidTicketPrice) || 0,
        currency: "INR",
        totalQuantity: parseInt(paidTicketCount) || 15,
        availableQuantity: parseInt(paidTicketCount) || 15,
        reservedQuantity: 0,
        soldQuantity: 0,
        maxPerUser: 5,
        isActive: true,
        seatType: paidTicketSeatType || "front",
        requiresPromoCode: false
      },
      {
        name: "Code Ticket",
        description: "Free ticket with unique promo code, back row seating",
        price: 0,
        currency: "INR",
        totalQuantity: parseInt(codeTicketCount) || 15,
        availableQuantity: parseInt(codeTicketCount) || 15,
        reservedQuantity: 0,
        soldQuantity: 0,
        maxPerUser: 1, // Each user can use only one free code
        isActive: true,
        seatType: codeTicketSeatType || "back",
        requiresPromoCode: true
      }
    ];

    // Create promo codes array - each code works only once
    const promoCodes = freePromoCodes.map((code, index) => ({
      code: code,
      originalCode: code, // Store original for reference
      discountType: "free", // 100% discount
      discountValue: 100,
      maxUses: 1, // Can be used only once
      usedCount: 0,
      isUsed: false,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true,
      applicableTicketTypes: ["Code Ticket"],
      description: `Free ticket code #${index + 1} - One time use only`,
      seatNumber: null, // Will be assigned when used
      usedBy: null,
      usedAt: null
    }));

    // Handle file paths from Cloudinary
    const bannerImage = req.files?.bannerImage?.[0]?.path;
    const thumbnailImage = req.files?.thumbnailImage?.[0]?.path;
    const galleryImages = req.files?.galleryImages?.map(file => file.path) || [];

    if (!bannerImage || !thumbnailImage) {
      return res.status(400).json({
        success: false,
        message: "Banner image and thumbnail image are required"
      });
    }

    // Create event
    const event = new Event({
      ...req.body,
      ticketTypes,
      promoCodes,
      adminReservations: [],
      bannerImage,
      thumbnailImage,
      galleryImages,
      geoLocation: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      seatingConfig,
      createdBy: "admin", // For demo, no auth
      status: "draft"
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: "Event created successfully with unique promo codes",
      data: {
        eventId: event._id,
        title: event.title,
        paidTickets: paidTicketCount,
        freeTickets: codeTicketCount,
        generatedPromoCodes: promoCodes.map(promo => ({
          code: promo.code,
          description: promo.description,
          validUntil: promo.validUntil
        }))
      }
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create event",
      error: error.message
    });
  }
};

// @desc    Check ticket availability with promo code validation
// @route   POST /api/events/:id/check-availability
// @access  Public
export const checkAvailability = async (req, res) => {
  try {
    const { ticketType, quantity = 1, promoCode } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const ticket = event.ticketTypes.find(t => t.name === ticketType);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket type not found"
      });
    }

    // Check if ticket is active
    if (!ticket.isActive) {
      return res.json({
        success: true,
        available: false,
        message: "This ticket type is not available"
      });
    }

    // Check if promo code is required for free tickets
    if (ticket.requiresPromoCode && !promoCode) {
      return res.json({
        success: true,
        available: false,
        message: "Promo code required for free tickets"
      });
    }

    // Validate promo code if provided
    if (promoCode) {
      const validPromo = event.promoCodes.find(p => 
        p.code === promoCode.toUpperCase() && 
        p.isActive &&
        !p.isUsed && // Check if code is already used
        p.usedCount < p.maxUses && // Check max uses (should be 1)
        new Date() >= p.validFrom &&
        new Date() <= p.validUntil &&
        (!p.applicableTicketTypes || p.applicableTicketTypes.includes(ticket.name))
      );

      if (!validPromo) {
        return res.json({
          success: true,
          available: false,
          message: "Invalid, expired, or already used promo code"
        });
      }

      // For free tickets with promo codes, quantity should be 1
      if (ticket.requiresPromoCode && quantity > 1) {
        return res.json({
          success: true,
          available: false,
          message: "Only 1 free ticket allowed per promo code"
        });
      }
    }

    // Check availability
    const available = ticket.availableQuantity >= quantity;

    // Check seat availability
    const availableSeats = generateSeatNumbers(event, ticket.seatType, quantity);
    const hasEnoughSeats = availableSeats.length >= quantity;

    res.json({
      success: true,
      available: available && hasEnoughSeats,
      data: {
        ticketType: ticket.name,
        requestedQuantity: quantity,
        availableQuantity: ticket.availableQuantity,
        availableSeats: availableSeats.length,
        price: ticket.price,
        totalPrice: ticket.price * quantity,
        requiresPromoCode: ticket.requiresPromoCode,
        seatType: ticket.seatType,
        canProceed: available && hasEnoughSeats,
        message: !hasEnoughSeats ? `Not enough ${ticket.seatType} seats available` : null,
        promoCodeValid: !!promoCode
      }
    });
  } catch (error) {
    console.error("Check availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check availability",
      error: error.message
    });
  }
};

// @desc    Reserve tickets (before payment)
// @route   POST /api/events/:id/reserve
// @access  Public
export const reserveTickets = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { ticketType, quantity = 1, promoCode, userInfo } = req.body;
    const event = await Event.findById(req.params.id).session(session);

    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const ticket = event.ticketTypes.find(t => t.name === ticketType);

    if (!ticket) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Ticket type not found"
      });
    }

    // Validate promo code for free tickets
    let promoCodeData = null;
    if (ticket.requiresPromoCode) {
      if (!promoCode) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Promo code required for free tickets"
        });
      }

      promoCodeData = event.promoCodes.find(p => 
        p.code === promoCode.toUpperCase() && 
        p.isActive &&
        !p.isUsed && // Check if not already used
        p.usedCount < p.maxUses &&
        new Date() >= p.validFrom &&
        new Date() <= p.validUntil &&
        (!p.applicableTicketTypes || p.applicableTicketTypes.includes(ticket.name))
      );

      if (!promoCodeData) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invalid, expired, or already used promo code"
        });
      }

      // Check if this promo code already has a seat assigned
      if (promoCodeData.seatNumber) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "This promo code has already been used"
        });
      }
    }

    // Check availability
    if (ticket.availableQuantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Only ${ticket.availableQuantity} tickets available`
      });
    }

    // Generate seat numbers
    const seatNumbers = generateSeatNumbers(event, ticket.seatType, quantity);
    if (seatNumbers.length < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Not enough ${ticket.seatType} seats available`
      });
    }

    // For free tickets with promo code, assign specific seat to the code
    if (promoCodeData && quantity === 1) {
      promoCodeData.seatNumber = seatNumbers[0]; // Assign first seat to this code
    }

    // Reserve tickets
    ticket.reservedQuantity += quantity;
    ticket.availableQuantity = ticket.totalQuantity - ticket.soldQuantity - ticket.reservedQuantity;

    // Mark promo code as used if applicable
    if (promoCodeData) {
      promoCodeData.usedCount += 1;
      promoCodeData.isUsed = true;
      promoCodeData.usedBy = userInfo?.email || 'anonymous';
      promoCodeData.usedAt = new Date();
    }

    await event.save({ session });

    // Create temporary reservation
    const reservation = {
      reservationId: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId: event._id,
      ticketType: ticket.name,
      quantity,
      seatNumbers,
      promoCode: promoCodeData ? promoCodeData.code : null,
      userInfo,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      totalAmount: ticket.price * quantity,
      discountAmount: promoCodeData ? (ticket.price * quantity) : 0,
      finalAmount: promoCodeData ? 0 : ticket.price * quantity,
      assignedSeat: promoCodeData ? seatNumbers[0] : null
    };

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Tickets reserved successfully",
      data: {
        reservationId: reservation.reservationId,
        eventId: event._id,
        eventTitle: event.title,
        ticketType: ticket.name,
        quantity,
        seatNumbers,
        seatType: ticket.seatType,
        subtotal: ticket.price * quantity,
        discount: promoCodeData ? (ticket.price * quantity) : 0,
        total: promoCodeData ? 0 : ticket.price * quantity,
        expiresAt: reservation.expiresAt,
        paymentRequired: !promoCodeData || promoCodeData.discountType !== "free",
        promoCodeInfo: promoCodeData ? {
          code: promoCodeData.code,
          seatAssigned: promoCodeData.seatNumber,
          isOneTimeUse: true
        } : null
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reserve tickets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reserve tickets",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Confirm booking (after payment/reservation)
// @route   POST /api/events/:id/confirm-booking
// @access  Public
export const confirmBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      reservationId, 
      paymentMethod = "cash", 
      paymentStatus = "completed",
      paymentId 
    } = req.body;

    const reservation = req.body.reservationData;

    if (!reservation) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Reservation data required"
      });
    }

    const event = await Event.findById(req.params.id).session(session);

    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const ticket = event.ticketTypes.find(t => t.name === reservation.ticketType);

    if (!ticket) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Ticket type not found"
      });
    }

    // Check if reservation is still valid
    if (new Date() > new Date(reservation.expiresAt)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Reservation expired"
      });
    }

    // For free tickets, verify promo code is still valid
    if (reservation.promoCode) {
      const promoCode = event.promoCodes.find(p => p.code === reservation.promoCode);
      if (!promoCode || promoCode.isUsed) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Promo code has already been used or is invalid"
        });
      }
    }

    // Update ticket counts
    ticket.reservedQuantity -= reservation.quantity;
    ticket.soldQuantity += reservation.quantity;
    ticket.availableQuantity = ticket.totalQuantity - ticket.soldQuantity - ticket.reservedQuantity;

    // Mark promo code as fully used and assign seat
    if (reservation.promoCode) {
      const promoCode = event.promoCodes.find(p => p.code === reservation.promoCode);
      if (promoCode) {
        promoCode.usedCount = (promoCode.usedCount || 0) + 1;
        promoCode.isUsed = true;
        promoCode.usedBy = reservation.userInfo?.email || 'anonymous';
        promoCode.usedAt = new Date();
        
        // If seat not already assigned, assign it
        if (!promoCode.seatNumber && reservation.seatNumbers.length > 0) {
          promoCode.seatNumber = reservation.seatNumbers[0];
        }
      }
    }

    // Create admin reservations for the seats
    const adminReservations = reservation.seatNumbers.map(seatNumber => ({
      seatNumber,
      ticketType: ticket.name,
      reservedFor: reservation.userInfo?.name || 'Anonymous',
      contactEmail: reservation.userInfo?.email || '',
      contactPhone: reservation.userInfo?.phone || '',
      isOccupied: true,
      reservedBy: "system",
      reservedAt: new Date(),
      promoCodeUsed: reservation.promoCode || null
    }));

    event.adminReservations.push(...adminReservations);

    // Update event analytics
    event.totalBookings += 1;
    event.totalRevenue += reservation.finalAmount;

    await event.save({ session });

    // Create booking record
    const booking = new Booking({
      bookingId: `BOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId: event._id,
      userId: reservation.userInfo?.userId,
      userName: reservation.userInfo?.name || 'Anonymous',
      userEmail: reservation.userInfo?.email || '',
      userPhone: reservation.userInfo?.phone || '',
      tickets: [{
        ticketTypeId: ticket._id,
        ticketTypeName: ticket.name,
        quantity: reservation.quantity,
        pricePerTicket: ticket.price,
        seatType: ticket.seatType,
        seatNumbers: reservation.seatNumbers,
        isPaid: reservation.finalAmount > 0,
        promoCodeUsed: reservation.promoCode
      }],
      subtotalAmount: reservation.subtotal,
      discountAmount: reservation.discount,
      totalAmount: reservation.finalAmount,
      amountPaid: reservation.finalAmount,
      paymentMethod,
      paymentStatus,
      paymentId,
      paymentDate: new Date(),
      bookingStatus: "confirmed",
      bookingSource: "web",
      promoCode: reservation.promoCode ? {
        code: reservation.promoCode,
        discountType: "free",
        discountValue: 100,
        discountApplied: reservation.discount
      } : null
    });

    await booking.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully",
      data: {
        bookingId: booking.bookingId,
        eventTitle: event.title,
        ticketType: ticket.name,
        quantity: reservation.quantity,
        seatNumbers: reservation.seatNumbers,
        seatType: ticket.seatType,
        totalAmount: reservation.finalAmount,
        paymentStatus,
        bookingDate: booking.createdAt,
        promoCodeUsed: reservation.promoCode,
        isPromoCodeUsed: !!reservation.promoCode,
        qrCode: `/api/bookings/${booking._id}/qrcode`
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Confirm booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm booking",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Add admin reserved seats
// @route   POST /api/events/:id/admin-reservations
// @access  Public (should be admin only in real app)
export const addAdminReservation = async (req, res) => {
  try {
    const { seatNumber, ticketType, reservedFor, contactEmail, contactPhone, notes } = req.body;
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if seat is already reserved
    const existingReservation = event.adminReservations.find(
      res => res.seatNumber === seatNumber
    );

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: "Seat already reserved"
      });
    }

    // Add admin reservation
    event.adminReservations.push({
      seatNumber,
      ticketType,
      reservedFor,
      contactEmail,
      contactPhone,
      isOccupied: false,
      notes,
      reservedBy: "admin",
      reservedAt: new Date()
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: "Admin reservation added successfully",
      data: event.adminReservations[event.adminReservations.length - 1]
    });
  } catch (error) {
    console.error("Add admin reservation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add admin reservation",
      error: error.message
    });
  }
};

// @desc    Get event with seat map
// @route   GET /api/events/:id/seat-map
// @access  Public
export const getSeatMap = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const { seatingConfig } = event;
    const seatMap = [];

    // Generate seat map
    for (let row = 1; row <= seatingConfig.totalRows; row++) {
      const rowLabel = String.fromCharCode(64 + row);
      const rowSeats = [];
      
      for (let seat = 1; seat <= seatingConfig.seatsPerRow; seat++) {
        const seatNumber = `${rowLabel}-${seat}`;
        
        // Determine seat type
        let seatType = "general";
        if (row >= seatingConfig.frontRowStart && row <= seatingConfig.frontRowEnd) {
          seatType = "front";
        } else if (row >= seatingConfig.middleRowStart && row <= seatingConfig.middleRowEnd) {
          seatType = "middle";
        } else if (row >= seatingConfig.backRowStart && row <= seatingConfig.backRowEnd) {
          seatType = "back";
        }

        // Check if seat is reserved
        const reservation = event.adminReservations.find(res => res.seatNumber === seatNumber);
        const isReserved = !!reservation;
        const reservedFor = reservation?.reservedFor;
        const isOccupied = reservation?.isOccupied || false;
        const promoCodeUsed = reservation?.promoCodeUsed;

        rowSeats.push({
          seatNumber,
          seatType,
          isReserved,
          isOccupied,
          reservedFor,
          promoCodeUsed,
          row: rowLabel,
          number: seat
        });
      }
      
      seatMap.push({
        row: rowLabel,
        seats: rowSeats
      });
    }

    // Get ticket availability
    const ticketAvailability = event.ticketTypes.map(ticket => ({
      name: ticket.name,
      seatType: ticket.seatType,
      price: ticket.price,
      availableQuantity: ticket.availableQuantity,
      totalQuantity: ticket.totalQuantity,
      soldQuantity: ticket.soldQuantity,
      reservedQuantity: ticket.reservedQuantity,
      requiresPromoCode: ticket.requiresPromoCode
    }));

    // Get promo code usage stats
    const promoCodeStats = {
      total: event.promoCodes.length,
      used: event.promoCodes.filter(p => p.isUsed).length,
      available: event.promoCodes.filter(p => !p.isUsed).length
    };

    res.json({
      success: true,
      data: {
        eventId: event._id,
        eventTitle: event.title,
        venueName: event.venueName,
        seatingConfig,
        seatMap,
        ticketAvailability,
        adminReservations: event.adminReservations,
        promoCodeStats,
        totalSeats: seatingConfig.totalRows * seatingConfig.seatsPerRow,
        availableSeats: event.ticketTypes.reduce((sum, ticket) => sum + ticket.availableQuantity, 0),
        bookedSeats: event.ticketTypes.reduce((sum, ticket) => sum + ticket.soldQuantity, 0)
      }
    });
  } catch (error) {
    console.error("Get seat map error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get seat map",
      error: error.message
    });
  }
};

// @desc    Get all events with filters
// @route   GET /api/events
// @access  Public
// @desc    Get all events with filters including category
// @route   GET /api/events
// @access  Public
export const getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      state,
      country,
      eventType,
      mode,
      category,
      dateFrom,
      dateTo,
      minPrice,
      maxPrice,
      sortBy = "startDate",
      sortOrder = "asc",
      isPublished = true,
      near // format: "lng,lat,radiusInKm"
    } = req.query;

    // Build query
    const query = { isPublished };

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { venueName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } }
      ];
    }

    // Location filters
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;

    // Event type, mode, and category
    if (eventType) query.eventType = eventType;
    if (mode) query.mode = mode;
    if (category) query.category = category;

    // Date range
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    // Price range
    if (minPrice || maxPrice) {
      query["ticketTypes.price"] = {};
      if (minPrice) query["ticketTypes.price"].$gte = Number(minPrice);
      if (maxPrice) query["ticketTypes.price"].$lte = Number(maxPrice);
      query["ticketTypes.isActive"] = true;
    }

    // Geo-spatial query for nearby events
    if (near) {
      const [lng, lat, radius = 50] = near.split(',');
      query.geoLocation = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) * 1000 // Convert km to meters
        }
      };
    }

    // Pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const events = await Event.find(query)
      .select("-adminReservations -promoCodes")
      .skip(skip)
      .limit(pageSize)
      .sort(sort);

    const totalEvents = await Event.countDocuments(query);

    res.json({
      success: true,
      count: events.length,
      total: totalEvents,
      totalPages: Math.ceil(totalEvents / pageSize),
      currentPage: pageNumber,
      data: events
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message
    });
  }
};

// @desc    Get all event categories with counts
// @route   GET /api/events/categories/all
// @access  Public
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Event.aggregate([
      { $match: { isPublished: true } },
      { $group: {
          _id: "$category",
          count: { $sum: 1 },
          upcoming: {
            $sum: {
              $cond: [{ $gte: ["$startDate", new Date()] }, 1, 0]
            }
          },
          totalViews: { $sum: "$totalViews" },
          totalBookings: { $sum: "$totalBookings" },
          totalRevenue: { $sum: "$totalRevenue" }
      }},
      { $sort: { count: -1 } }
    ]);

    // Format categories
    const formattedCategories = categories.map(cat => ({
      name: cat._id,
      displayName: cat._id.charAt(0).toUpperCase() + cat._id.slice(1),
      count: cat.count,
      upcoming: cat.upcoming,
      past: cat.count - cat.upcoming,
      totalViews: cat.totalViews,
      totalBookings: cat.totalBookings,
      totalRevenue: cat.totalRevenue
    }));

    res.json({
      success: true,
      count: categories.length,
      data: formattedCategories
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Increment views
    event.totalViews += 1;
    await event.save();

    // Remove sensitive promo code data for public view
    const eventData = event.toObject();
    eventData.promoCodes = eventData.promoCodes.map(promo => ({
      code: promo.code,
      discountType: promo.discountType,
      description: promo.description,
      validUntil: promo.validUntil,
      isUsed: promo.isUsed
    }));

    res.json({
      success: true,
      data: eventData
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
      error: error.message
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Public (should be admin only)
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Handle geo location update
    if (req.body.longitude && req.body.latitude) {
      req.body.geoLocation = {
        type: "Point",
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
      };
    }

    // Update event
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    });

    event.updatedBy = "admin";
    event.updatedAt = new Date();

    await event.save();

    res.json({
      success: true,
      message: "Event updated successfully",
      data: event
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update event",
      error: error.message
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Public (should be admin only)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
      error: error.message
    });
  }
};

// @desc    Add promo code
// @route   POST /api/events/:id/promo-codes
// @access  Public (should be admin only)
export const addPromoCode = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if promo code already exists
    const existingPromo = event.promoCodes.find(
      promo => promo.code === req.body.code.toUpperCase()
    );

    if (existingPromo) {
      return res.status(400).json({
        success: false,
        message: "Promo code already exists for this event"
      });
    }

    // Add promo code
    event.promoCodes.push({
      ...req.body,
      code: req.body.code.toUpperCase(),
      usedCount: 0,
      isUsed: false,
      isActive: true,
      seatNumber: null,
      usedBy: null,
      usedAt: null
    });

    event.updatedBy = "admin";
    await event.save();

    res.status(201).json({
      success: true,
      message: "Promo code added successfully",
      data: event.promoCodes[event.promoCodes.length - 1]
    });
  } catch (error) {
    console.error("Add promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add promo code",
      error: error.message
    });
  }
};

// @desc    Get available promo codes for an event
// @route   GET /api/events/:id/available-promo-codes
// @access  Public (Admin only in real app)
export const getAvailablePromoCodes = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const availablePromoCodes = event.promoCodes.filter(promo => 
      promo.isActive && 
      !promo.isUsed && 
      promo.usedCount < promo.maxUses &&
      new Date() <= promo.validUntil
    );

    const usedPromoCodes = event.promoCodes.filter(promo => 
      promo.isUsed || promo.usedCount >= promo.maxUses
    );

    res.json({
      success: true,
      data: {
        totalGenerated: event.promoCodes.length,
        available: availablePromoCodes.length,
        used: usedPromoCodes.length,
        availableCodes: availablePromoCodes.map(promo => ({
          code: promo.code,
          description: promo.description,
          validUntil: promo.validUntil,
          seatType: "back" // Default seat type for free tickets
        })),
        usedCodes: usedPromoCodes.map(promo => ({
          code: promo.code,
          usedBy: promo.usedBy,
          usedAt: promo.usedAt,
          seatNumber: promo.seatNumber
        }))
      }
    });
  } catch (error) {
    console.error("Get promo codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promo codes",
      error: error.message
    });
  }
};

// @desc    Publish event
// @route   PUT /api/events/:id/publish
// @access  Public (should be admin only)
export const publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Validate required fields before publishing
    const validationErrors = [];

    if (!event.bannerImage) validationErrors.push("Banner image is required");
    if (!event.thumbnailImage) validationErrors.push("Thumbnail image is required");
    if (event.ticketTypes.length === 0) validationErrors.push("At least one ticket type is required");
    if (!event.startDate || !event.endDate) validationErrors.push("Event dates are required");
    if (!event.geoLocation || !event.geoLocation.coordinates) {
      validationErrors.push("Geo location is required");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish event",
        errors: validationErrors
      });
    }

    event.isPublished = true;
    event.status = "published";
    event.updatedBy = "admin";
    await event.save();

    res.json({
      success: true,
      message: "Event published successfully",
      data: event
    });
  } catch (error) {
    console.error("Publish event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish event",
      error: error.message
    });
  }
};

// @desc    Unpublish event
// @route   PUT /api/events/:id/unpublish
// @access  Public (should be admin only)
export const unpublishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    event.isPublished = false;
    event.status = "draft";
    event.updatedBy = "admin";
    await event.save();

    res.json({
      success: true,
      message: "Event unpublished successfully",
      data: event
    });
  } catch (error) {
    console.error("Unpublish event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpublish event",
      error: error.message
    });
  }
};

// @desc    Get event analytics
// @route   GET /api/events/:id/analytics
// @access  Public (should be admin only)
export const getEventAnalytics = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const bookings = await Booking.find({ eventId: event._id });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const analytics = {
      eventId: event._id,
      title: event.title,
      overview: {
        totalViews: event.totalViews,
        totalBookings: event.totalBookings,
        totalRevenue: event.totalRevenue,
        conversionRate: event.totalViews > 0 ? 
          (event.totalBookings / event.totalViews) * 100 : 0
      },
      ticketAnalytics: event.ticketTypes.map(ticket => ({
        name: ticket.name,
        seatType: ticket.seatType,
        totalQuantity: ticket.totalQuantity,
        soldQuantity: ticket.soldQuantity,
        reservedQuantity: ticket.reservedQuantity,
        availableQuantity: ticket.availableQuantity,
        soldPercentage: (ticket.soldQuantity / ticket.totalQuantity) * 100,
        revenue: ticket.soldQuantity * ticket.price,
        requiresPromoCode: ticket.requiresPromoCode
      })),
      seatOccupancy: {
        totalSeats: event.seatingConfig.totalRows * event.seatingConfig.seatsPerRow,
        reservedSeats: event.adminReservations.length,
        occupiedSeats: event.adminReservations.filter(r => r.isOccupied).length,
        availableSeats: (event.seatingConfig.totalRows * event.seatingConfig.seatsPerRow) - 
                       event.adminReservations.length
      },
      promoCodeAnalytics: {
        totalPromoCodes: event.promoCodes.length,
        usedPromoCodes: event.promoCodes.filter(p => p.isUsed).length,
        availablePromoCodes: event.promoCodes.filter(p => !p.isUsed).length,
        usageRate: (event.promoCodes.filter(p => p.isUsed).length / event.promoCodes.length) * 100
      },
      bookingStats: {
        totalBookings: bookings.length,
        paidBookings: bookings.filter(b => b.totalAmount > 0).length,
        freeBookings: bookings.filter(b => b.totalAmount === 0).length,
        checkedIn: bookings.filter(b => b.checkedIn).length,
        cancelled: bookings.filter(b => b.bookingStatus === "cancelled").length
      },
      revenueByTicketType: event.ticketTypes.reduce((acc, ticket) => {
        acc[ticket.name] = ticket.soldQuantity * ticket.price;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message
    });
  }
};




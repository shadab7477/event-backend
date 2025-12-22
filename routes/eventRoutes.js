// routes/eventRoutes.js
import express from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  checkAvailability,
  reserveTickets,
  confirmBooking,
  addAdminReservation,
  getSeatMap,
  addPromoCode,
  getAvailablePromoCodes,
  publishEvent,
  unpublishEvent,
  getEventAnalytics
} from "../controllers/eventController.js";
import {
  uploadEventImages
} from "../config/cloudinary.js";

const router = express.Router();

// Public routes
router.get("/", getEvents);
router.get("/:id", getEventById);
router.get("/:id/seat-map", getSeatMap);
router.get("/:id/available-promo-codes", getAvailablePromoCodes);
router.post("/:id/check-availability", checkAvailability);
router.post("/:id/reserve", reserveTickets);
router.post("/:id/confirm-booking", confirmBooking);

// Admin routes (no auth for demo)
router.post("/", uploadEventImages, createEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.put("/:id/publish", publishEvent);
router.put("/:id/unpublish", unpublishEvent);
router.post("/:id/admin-reservations", addAdminReservation);
router.post("/:id/promo-codes", addPromoCode);
router.get("/:id/analytics", getEventAnalytics);

export default router;
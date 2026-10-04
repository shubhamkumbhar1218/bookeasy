import express from "express";

import Review from "../models/Review.js";
import Booking from "../models/Booking.js";

const router = express.Router();


// ======================================================
// CREATE REVIEW
// POST /api/reviews
// ======================================================

router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      customerName,
      customerPhone,
      rating,
      review,
    } = req.body;

    if (
      !bookingId ||
      !customerName ||
      !customerPhone ||
      !rating ||
      !review
    ) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    // Only completed bookings can be reviewed
    if (booking.status !== "completed") {
      return res.status(400).json({
        message:
          "You can review the service only after the booking is completed.",
      });
    }

    // Make sure phone belongs to booking
    if (
      String(booking.customerPhone).trim() !==
      String(customerPhone).trim()
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to review this booking.",
      });
    }

    // Check duplicate review
    const existingReview = await Review.findOne({
      bookingId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this booking.",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5.",
      });
    }

    if (review.trim().length < 3) {
      return res.status(400).json({
        message: "Review must contain at least 3 characters.",
      });
    }

    const newReview = await Review.create({
      businessId: booking.businessId,
      serviceId: booking.serviceId,
      bookingId: booking._id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      rating: numericRating,
      review: review.trim(),
    });

    res.status(201).json({
      message: "Review submitted successfully.",
      review: newReview,
    });
  } catch (error) {
    console.log("CREATE REVIEW ERROR:", error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});


// ======================================================
// GET REVIEWS FOR SERVICE
// GET /api/reviews/service/:serviceId
// ======================================================

router.get(
  "/service/:serviceId",
  async (req, res) => {
    try {
      const { serviceId } = req.params;

      const reviews = await Review.find({
        serviceId,
      })
        .sort({
          createdAt: -1,
        })
        .select(
          "customerName rating review createdAt"
        );

      const totalReviews = reviews.length;

      const averageRating =
        totalReviews > 0
          ? reviews.reduce(
              (total, item) =>
                total + item.rating,
              0
            ) / totalReviews
          : 0;

      res.json({
        reviews,
        totalReviews,
        averageRating: Number(
          averageRating.toFixed(1)
        ),
      });
    } catch (error) {
      console.log(
        "GET SERVICE REVIEWS ERROR:",
        error
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);


// ======================================================
// CHECK REVIEW STATUS
// GET /api/reviews/booking/:bookingId?phone=...
// ======================================================

router.get(
  "/booking/:bookingId",
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { phone } = req.query;

      const booking = await Booking.findById(
        bookingId
      );

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found.",
        });
      }

      const existingReview =
        await Review.findOne({
          bookingId,
        });

      const phoneMatches =
        String(booking.customerPhone).trim() ===
        String(phone || "").trim();

      const canReview =
        booking.status === "completed" &&
        phoneMatches &&
        !existingReview;

      res.json({
        canReview,
        alreadyReviewed: Boolean(
          existingReview
        ),
        bookingStatus: booking.status,
        review: existingReview || null,
      });
    } catch (error) {
      console.log(
        "CHECK REVIEW ERROR:",
        error
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

export default router;
import express from "express";
import User from "../models/User.js";
import PLANS from "../config/plans.js";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";

const router = express.Router();


async function hasReviewAccess(businessId) {
  const owner = await User.findById(businessId).select(
    "role accountStatus isActive plan subscriptionStatus subscriptionEndDate"
  );

  if (
    !owner ||
    owner.role !== "BUSINESS" ||
    owner.accountStatus !== "ACTIVE" ||
    owner.isActive === false
  ) {
    return false;
  }

  const plan = PLANS[String(owner.plan || "FREE").toUpperCase()];

  if (!plan?.features?.includes("reviews")) {
    return false;
  }

  return (
    owner.subscriptionStatus === "ACTIVE" &&
    owner.subscriptionEndDate instanceof Date &&
    !Number.isNaN(owner.subscriptionEndDate.getTime()) &&
    owner.subscriptionEndDate.getTime() > Date.now()
  );
}


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

    // --------------------------------------------------
    // Validate required fields
    // --------------------------------------------------

    if (
      !bookingId ||
      !customerName ||
      !customerPhone ||
      rating === undefined ||
      rating === null ||
      !review
    ) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    // --------------------------------------------------
    // Validate booking ID
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    // --------------------------------------------------
    // Find booking
    // --------------------------------------------------

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    const reviewAccess = await hasReviewAccess(
  booking.businessId
);

if (!reviewAccess) {
  return res.status(403).json({
    message:
      "Reviews are available on eligible paid plans. Please contact the business or upgrade its plan.",
    upgradeRequired: true,
  });
}

    // --------------------------------------------------
    // Only completed bookings can be reviewed
    // --------------------------------------------------

    if (booking.status !== "completed") {
      return res.status(400).json({
        message:
          "You can review the service only after the booking is completed.",
      });
    }

    // --------------------------------------------------
    // Make sure customer phone belongs to booking
    // --------------------------------------------------

    const bookingPhone = String(
      booking.customerPhone || ""
    ).trim();

    const submittedPhone = String(
      customerPhone || ""
    ).trim();

    if (
      !bookingPhone ||
      bookingPhone !== submittedPhone
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to review this booking.",
      });
    }

    // --------------------------------------------------
    // Make sure booking has a service
    // --------------------------------------------------

    if (!booking.serviceId) {
      return res.status(400).json({
        message:
          "This booking is not associated with a service.",
      });
    }

    // --------------------------------------------------
    // Check duplicate review
    // --------------------------------------------------

    const existingReview = await Review.findOne({
      bookingId: booking._id,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this booking.",
      });
    }

    // --------------------------------------------------
    // Validate rating
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Validate review text
    // --------------------------------------------------

    const cleanReview = String(review).trim();

    if (cleanReview.length < 3) {
      return res.status(400).json({
        message:
          "Review must contain at least 3 characters.",
      });
    }

    if (cleanReview.length > 500) {
      return res.status(400).json({
        message:
          "Review cannot contain more than 500 characters.",
      });
    }

    // --------------------------------------------------
    // IMPORTANT:
    //
    // serviceId comes FROM THE BOOKING.
    //
    // We do NOT trust a serviceId sent by the mobile app.
    //
    // Therefore:
    //
    // Booking -> serviceId
    // Review  -> same serviceId
    //
    // This guarantees the review belongs to the
    // service that was actually booked.
    // --------------------------------------------------

    const newReview = await Review.create({
      businessId: booking.businessId,
      serviceId: booking.serviceId,
      bookingId: booking._id,
      customerName: String(
        booking.customerName || customerName
      ).trim(),
      customerPhone: bookingPhone,
      rating: numericRating,
      review: cleanReview,
    });

    // --------------------------------------------------
    // Return created review
    // --------------------------------------------------

    return res.status(201).json({
      message: "Review submitted successfully.",
      review: newReview,
    });

  } catch (error) {
    console.log("CREATE REVIEW ERROR:", error);

    // Handle duplicate bookingId index safely
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "You have already reviewed this booking.",
      });
    }

    return res.status(500).json({
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

      // --------------------------------------------------
      // Validate service ID
      // --------------------------------------------------

      const service = await Service.findById(serviceId)
  .select("businessId");

if (!service) {
  return res.status(404).json({
    message: "Service not found.",
  });
}

const reviewAccess = await hasReviewAccess(
  service.businessId
);

if (!reviewAccess) {
  return res.json({
    reviews: [],
    totalReviews: 0,
    averageRating: 0,
  });
}


      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({
          message: "Invalid service ID.",
        });
      }

      // --------------------------------------------------
      // Find reviews ONLY for this service
      // --------------------------------------------------

      const reviews = await Review.find({
        serviceId,
      })
        .sort({
          createdAt: -1,
        })
        .select(
          "customerName rating review createdAt"
        );

      // --------------------------------------------------
      // Calculate service-specific rating
      // --------------------------------------------------

      const totalReviews = reviews.length;

      const averageRating =
        totalReviews > 0
          ? reviews.reduce(
              (total, item) =>
                total + Number(item.rating),
              0
            ) / totalReviews
          : 0;

      return res.json({
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

      return res.status(500).json({
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

      // --------------------------------------------------
      // Validate booking ID
      // --------------------------------------------------

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({
          message: "Invalid booking ID.",
        });
      }

      // --------------------------------------------------
      // Find booking
      // --------------------------------------------------

      const booking = await Booking.findById(
        bookingId
      );

      if (!booking) {
  return res.status(404).json({
    message: "Booking not found.",
  });
}

// VERIFY CUSTOMER PHONE HERE
const bookingPhone = String(
  booking.customerPhone || ""
).trim();

const requestedPhone = String(
  req.query.phone || ""
).trim();

if (
  !bookingPhone ||
  !requestedPhone ||
  bookingPhone !== requestedPhone
) {
  return res.status(403).json({
    message: "You are not allowed to view this review status.",
  });
}

      // --------------------------------------------------
      // Find existing review
      // --------------------------------------------------

      const existingReview =
        await Review.findOne({
          bookingId,
        });

      // --------------------------------------------------
      // Verify customer phone
      // --------------------------------------------------

      // const bookingPhone = String(
      //   booking.customerPhone || ""
      // ).trim();

      // const requestedPhone = String(
      //   phone || ""
      // ).trim();

      const phoneMatches =
        bookingPhone !== "" &&
        bookingPhone === requestedPhone;

      // --------------------------------------------------
      // Customer can review ONLY when:
      //
      // 1. Booking is completed
      // 2. Phone matches
      // 3. No review exists
      // --------------------------------------------------


const reviewAccess = await hasReviewAccess(
  booking.businessId
);

const canReview =
  reviewAccess &&
  booking.status === "completed" &&
  phoneMatches &&
  !existingReview;

return res.json({
  canReview,
  reviewAccess,
  alreadyReviewed: Boolean(existingReview),
  bookingStatus: booking.status,
  serviceId: booking.serviceId || null,
  review: existingReview || null,
});


    } catch (error) {
      console.log(
        "CHECK REVIEW ERROR:",
        error
      );

      return res.status(500).json({
        message: "Server error.",
      });
    }
  }
);


export default router;

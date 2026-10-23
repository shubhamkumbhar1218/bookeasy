import express from "express";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import authMiddleware from "../middleware/authMiddleware.js";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Booking from "../models/Booking.js";
import PLANS from "../config/plans.js";

const router = express.Router();

// ======================================================
// IMAGE UPLOAD CONFIGURATION
// ======================================================

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WebP images are allowed.")
      );
    }

    callback(null, true);
  },
});

// ======================================================
// SEARCH BUSINESSES + SERVICES + RATINGS
// ======================================================

router.get("/search", async (req, res) => {
  try {
    const { search, location, category } = req.query;

    const searchText =
      search?.trim() || location?.trim() || "";

    let matchingServiceBusinessIds = [];
    let matchingServiceIds = [];

    if (searchText) {
      const matchingServices = await Service.find({
        name: {
          $regex: searchText,
          $options: "i",
        },
        isActive: true,
      }).select("_id businessId");

      matchingServiceBusinessIds =
        matchingServices.map((service) => service.businessId);

      matchingServiceIds =
        matchingServices.map((service) => service._id.toString());
    }

    const query = {};

    if (searchText) {
      query.$or = [
        {
          businessName: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          address: {
            $regex: searchText,
            $options: "i",
          },
        },
      ];

      if (matchingServiceBusinessIds.length > 0) {
        query.$or.push({
          _id: {
            $in: matchingServiceBusinessIds,
          },
        });
      }
    }

    if (
      category &&
      category.trim() &&
      category.toLowerCase() !== "all"
    ) {
      query.businessType = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    const businesses = await User.find(query)
      .select(
        "businessName businessSlug businessType phone address name workingHours profilePhoto"
      )
      .sort({ businessName: 1 });

    const businessesWithServices = await Promise.all(
      businesses.map(async (business) => {
        const serviceQuery = {
          businessId: business._id,
          isActive: true,
        };

        if (
          searchText &&
          matchingServiceIds.length > 0
        ) {
          const businessHasMatchingService =
            matchingServiceBusinessIds.some(
              (id) =>
                id.toString() === business._id.toString()
            );

          if (businessHasMatchingService) {
            serviceQuery._id = {
              $in: matchingServiceIds,
            };
          }
        }

        const services = await Service.find(serviceQuery)
          .select(
            "_id businessId name description price duration isActive"
          )
          .sort({ name: 1 });

        const serviceIds = services.map(
          (service) => service._id
        );

        const reviewStats =
          serviceIds.length > 0
            ? await Review.aggregate([
                {
                  $match: {
                    serviceId: { $in: serviceIds },
                  },
                },
                {
                  $group: {
                    _id: "$serviceId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                  },
                },
              ])
            : [];

        const ratingMap = {};

        reviewStats.forEach((item) => {
          ratingMap[item._id.toString()] = {
            averageRating: Number(
              item.averageRating.toFixed(1)
            ),
            totalReviews: item.totalReviews,
          };
        });

        const servicesWithRatings = services.map(
          (service) => {
            const rating = ratingMap[service._id.toString()];

            return {
              ...service.toObject(),
              averageRating: rating?.averageRating || 0,
              totalReviews: rating?.totalReviews || 0,
            };
          }
        );

        const businessRating = await Review.aggregate([
          {
            $match: {
              businessId: business._id,
            },
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
        ]);

        let businessAverageRating = 0;
        let businessTotalReviews = 0;

        if (businessRating.length > 0) {
          businessAverageRating = Number(
            businessRating[0].averageRating.toFixed(1)
          );

          businessTotalReviews =
            businessRating[0].totalReviews;
        }

        return {
          ...business.toObject(),
          services: servicesWithRatings,
          averageRating: businessAverageRating,
          totalReviews: businessTotalReviews,
        };
      })
    );

    const businessesWithActiveServices =
      businessesWithServices.filter(
        (business) => business.services.length > 0
      );

    return res.json({
      count: businessesWithActiveServices.length,
      businesses: businessesWithActiveServices,
    });
  } catch (error) {
    console.error("Business search error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// GET LOGGED-IN BUSINESS PROFILE
// ======================================================

router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get business profile error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// UPDATE LOGGED-IN BUSINESS PROFILE
// ======================================================

router.patch("/profile/me", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      businessName,
      businessType,
      phone,
      address,
      workingHours,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof businessName !== "string" ||
      !businessName.trim()
    ) {
      return res.status(400).json({
        message: "Name and business name are required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = name.trim();
    user.businessName = businessName.trim();
    user.businessType = businessType || "other";
    user.phone = phone?.trim() || "";
    user.address = address?.trim() || "";

    if (workingHours) {
      const dayNames = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      const normalizedWorkingHours = {};

      for (const day of dayNames) {
        const capitalizedDay =
          day.charAt(0).toUpperCase() + day.slice(1);

        const dayData =
          workingHours[day] ||
          workingHours[capitalizedDay];

        if (!dayData) {
          normalizedWorkingHours[day] = {
            open: "09:00",
            close: "18:00",
            closed: false,
          };

          continue;
        }

        normalizedWorkingHours[day] = {
          open: dayData.open?.trim() || "09:00",
          close: dayData.close?.trim() || "18:00",
          closed: dayData.closed === true,
        };
      }

      user.workingHours = normalizedWorkingHours;
    }

    await user.save();

    return res.json({
      message: "Business profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        businessSlug: user.businessSlug,
        businessType: user.businessType,
        phone: user.phone,
        address: user.address,
        workingHours: user.workingHours,
        profilePhoto: user.profilePhoto || "",
        profilePhotoPublicId: user.profilePhotoPublicId || "",
      },
    });
  } catch (error) {
    console.error("Update business profile error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// UPLOAD OR REPLACE BUSINESS PROFILE PHOTO
// POST /api/business/profile/photo
// ======================================================

router.post(
  "/profile/photo",
  authMiddleware,
  (req, res, next) => {
    profilePhotoUpload.single("profilePhoto")(
      req,
      res,
      (error) => {
        if (error) {
          return res.status(400).json({
            message:
              error.code === "LIMIT_FILE_SIZE"
                ? "Image must be 5 MB or smaller."
                : error.message,
          });
        }

        next();
      }
    );
  },
  async (req, res) => {
    let uploadedPublicId = "";

    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a profile photo.",
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const base64Image =
        req.file.buffer.toString("base64");

      const imageData =
        `data:${req.file.mimetype};base64,${base64Image}`;

      const result = await cloudinary.uploader.upload(
        imageData,
        {
          folder: "bookeasy/business-profiles",
          resource_type: "image",
        }
      );

      uploadedPublicId = result.public_id;

      const oldPublicId = user.profilePhotoPublicId;

      user.profilePhoto = result.secure_url;
      user.profilePhotoPublicId = result.public_id;

      await user.save();

      // Remove the previous image after the new image is saved.
      if (
        oldPublicId &&
        oldPublicId !== result.public_id
      ) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (deleteError) {
          console.error(
            "Old profile photo cleanup failed:",
            deleteError.message
          );
        }
      }

      return res.json({
        message: "Business profile photo updated successfully",
        profilePhoto: user.profilePhoto,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
          businessSlug: user.businessSlug,
          businessType: user.businessType,
          phone: user.phone,
          address: user.address,
          workingHours: user.workingHours,
          profilePhoto: user.profilePhoto,
          profilePhotoPublicId: user.profilePhotoPublicId,
        },
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);

      // Clean up a newly uploaded image if saving failed.
      if (uploadedPublicId) {
        try {
          await cloudinary.uploader.destroy(uploadedPublicId);
        } catch (cleanupError) {
          console.error(
            "Upload cleanup failed:",
            cleanupError.message
          );
        }
      }

      return res.status(500).json({
        message: "Could not update profile photo.",
      });
    }
  }
);

// ======================================================
// REMOVE BUSINESS PROFILE PHOTO
// DELETE /api/business/profile/photo
// ======================================================

router.delete(
  "/profile/photo",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const oldPublicId = user.profilePhotoPublicId;

      user.profilePhoto = "";
      user.profilePhotoPublicId = "";

      await user.save();

      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (deleteError) {
          console.error(
            "Cloudinary photo deletion failed:",
            deleteError.message
          );
        }
      }

      return res.json({
        message: "Business profile photo removed successfully",
        profilePhoto: "",
      });
    } catch (error) {
      console.error("Profile photo removal error:", error);

      return res.status(500).json({
        message: "Could not remove profile photo.",
      });
    }
  }
);


 // ======================================================
 // GET CURRENT SUBSCRIPTION AND MONTHLY BOOKING USAGE
 // GET /api/business/subscription/me
 // ======================================================

router.get(
  "/subscription/me",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
       .select(
  "role accountStatus isActive plan subscriptionStatus " +
  "subscriptionStartDate subscriptionEndDate " +
  "subscriptionBillingMode subscriptionNextBillingDate " +
  "subscriptionLastPaymentAt subscriptionLastPaymentId " +
  "cashfreeSubscriptionStatus"
);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.role !== "BUSINESS") {
        return res.status(403).json({
          message: "Business account required",
        });
      }

      let effectivePlan = user.plan || "FREE";

      const now = new Date();

      const isPaidPlan = effectivePlan !== "FREE";

      const subscriptionExpired =
        user.subscriptionEndDate &&
        new Date(user.subscriptionEndDate) <= now;

const hasUnexpiredPeriod =
  user.subscriptionEndDate &&
  new Date(user.subscriptionEndDate) > now;

if (
  isPaidPlan &&
  (
    subscriptionExpired ||
    (
      user.subscriptionStatus !== "ACTIVE" &&
      !hasUnexpiredPeriod
    )
  )
) {
  effectivePlan = "FREE";
}

      const plan = PLANS[effectivePlan];

      if (!plan) {
        return res.status(500).json({
          message: "Invalid subscription plan",
        });
      }

      // Current calendar month in India
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
      }).formatToParts(now);

      const year = Number(
        parts.find((part) => part.type === "year").value
      );

      const month = Number(
        parts.find((part) => part.type === "month").value
      );

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

      const monthStart = new Date(
        Date.UTC(year, month - 1, 1) - IST_OFFSET_MS
      );

      const nextMonthStart = new Date(
        Date.UTC(year, month, 1) - IST_OFFSET_MS
      );

      const bookingsUsed = await Booking.countDocuments({
        businessId: user._id,
        createdAt: {
          $gte: monthStart,
          $lt: nextMonthStart,
        },
      });

      const bookingLimit = plan.bookingLimit;

      return res.json({
        plan: effectivePlan,
        planName: plan.name,
        price: plan.price,
        subscriptionStatus:
  isPaidPlan && subscriptionExpired
    ? "EXPIRED"
    : effectivePlan === "FREE"
      ? "ACTIVE"
      : user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        subscriptionBillingMode:
  user.subscriptionBillingMode || "MANUAL",

subscriptionNextBillingDate:
  user.subscriptionNextBillingDate ||
  user.subscriptionEndDate,

subscriptionLastPaymentAt:
  user.subscriptionLastPaymentAt || null,

cashfreeSubscriptionStatus:
  user.cashfreeSubscriptionStatus || null,
        usage: {
          bookingsUsed,
          bookingLimit,
          unlimited: bookingLimit === null,
          remaining:
            bookingLimit === null
              ? null
              : Math.max(0, bookingLimit - bookingsUsed),
          monthStartsAt: monthStart,
          resetsAt: nextMonthStart,
        },
        features: plan.features,

availablePlans: Object.entries(PLANS)
  .filter(([key]) => ["FREE", "STARTER"].includes(key))
  .map(([key, value]) => ({
    id: key,
    name: value.name,
    price: value.price,
    bookingLimit: value.bookingLimit,
    features: value.features,
  })),

      });
    } catch (error) {
      console.error(
        "Get subscription details error:",
        error
      );

      return res.status(500).json({
        message: "Unable to load subscription details",
      });
    }
  }
);


// ======================================================
// PUBLIC BUSINESS INFORMATION
// GET /api/business/:slug
// ======================================================

router.get("/:slug", async (req, res) => {
  try {
    const business = await User.findOne({
      businessSlug: req.params.slug,
    }).select(
      "businessName businessSlug businessType phone address name workingHours profilePhoto"
    );

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    return res.json(business);
  } catch (error) {
    console.error("Get public business error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;

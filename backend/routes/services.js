import express from "express";
import mongoose from "mongoose";

import Service from "../models/Service.js";
import Review from "../models/Review.js";
import Staff from "../models/Staff.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireFeature } from "../middleware/requireFeature.js";

const router = express.Router();

// Healthcare businesses require explicit service-wise staff eligibility.
const HEALTHCARE_BUSINESS_TYPES = new Set([
  "hospital",
  "dental clinic",
  "doctor / clinic",
  "physiotherapy",
  "diagnostic lab",
  "pet clinic / veterinary",
]);

const requiresExplicitServiceStaff = (business) =>
  HEALTHCARE_BUSINESS_TYPES.has(
    String(business?.businessType || "").trim().toLowerCase()
  );

// ========================================
// STAFF FEATURE CHECK
// Only required when staffIds is supplied.
// Existing service CRUD remains available
// according to its existing permissions.
// ========================================

const requireStaffManagementIfRequested = (
  req,
  res,
  next
) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      req.body || {},
      "staffIds"
    )
  ) {
    return next();
  }

  return requireFeature("staff_management")(
    req,
    res,
    next
  );
};


// ========================================
// VALIDATE ELIGIBLE STAFF
// ========================================

const validateStaffIds = async (
  staffIds,
  businessId
) => {
  if (!Array.isArray(staffIds)) {
    return {
      valid: false,
      message: "staffIds must be an array.",
    };
  }

  const uniqueIds = [...new Set(staffIds.map(String))];

  if (uniqueIds.length !== staffIds.length) {
    return {
      valid: false,
      message: "Duplicate staff members are not allowed.",
    };
  }

  for (const id of uniqueIds) {
    if (!mongoose.isValidObjectId(id)) {
      return {
        valid: false,
        message: "One or more staff IDs are invalid.",
      };
    }
  }

  if (uniqueIds.length === 0) {
    return {
      valid: true,
      staffIds: [],
    };
  }

  const matchingStaff = await Staff.find({
    _id: { $in: uniqueIds },
    businessId,
    isActive: true,
  }).select("_id");

  if (matchingStaff.length !== uniqueIds.length) {
    return {
      valid: false,
      message:
        "One or more selected team members are inactive or do not belong to your business.",
    };
  }

  return {
    valid: true,
    staffIds: matchingStaff.map((staff) => staff._id),
  };
};


// ========================================
// CREATE SERVICE
// POST /api/services
// ========================================

router.post(
  "/",
  authMiddleware,
  requireStaffManagementIfRequested,
  async (req, res) => {
    try {
      const {
        businessId,
        name,
        description,
        price,
        duration,
        slotIntervalMinutes = 30,
        bufferMinutes = 0,
      } = req.body;

      if (
        !businessId ||
        !mongoose.isValidObjectId(businessId) ||
        businessId.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only create services for your own business.",
        });
      }

      if (
        req.user.role !== "BUSINESS" ||
        !name?.trim() ||
        price === undefined ||
        price === null ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        duration === undefined ||
        duration === null ||
        !Number.isFinite(Number(duration)) ||
        ![15, 20, 30, 45, 60].includes(Number(duration)) ||
        ![5, 10, 15, 20, 30].includes(
          Number(slotIntervalMinutes)
        ) ||
        ![0, 5, 10, 15].includes(Number(bufferMinutes))
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Provide a valid service name, price, duration, slot interval and buffer.",
        });
      }

let staffIds = [];

const business = await User.findById(req.user.id)
  .select("businessType");

if (
  requiresExplicitServiceStaff(business) &&
  !Array.isArray(req.body.staffIds)
) {
  return res.status(400).json({
    success: false,
    message:
      "Healthcare services require at least one eligible doctor or team member.",
  });
}

if (
  Object.prototype.hasOwnProperty.call(
    req.body,
    "staffIds"
  )
) {
  const validation = await validateStaffIds(
    req.body.staffIds,
    req.user.id
  );

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  staffIds = validation.staffIds;
}

if (
  requiresExplicitServiceStaff(business) &&
  staffIds.length === 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Select at least one eligible doctor or team member for this healthcare service.",
  });
}

      const service = await Service.create({
        businessId: req.user.id,
        staffIds,
        name: name.trim(),
        description,
        price: Number(price),
        duration: Number(duration),
        slotIntervalMinutes: Number(slotIntervalMinutes),
        bufferMinutes: Number(bufferMinutes),
      });

      return res.status(201).json({
        success: true,
        message: "Service created successfully.",
        service,
      });
    } catch (error) {
      console.error("CREATE SERVICE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create service.",
      });
    }
  }
);


// ========================================
// GET ACTIVE SERVICES FOR BUSINESS
// GET /api/services/:businessId
// ========================================

router.get("/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({
        message: "Invalid business ID.",
      });
    }

    const services = await Service.find({
      businessId,
      isActive: true,
    }).lean();

    if (services.length === 0) {
      return res.json([]);
    }

    const serviceIds = services.map(
      (service) => service._id
    );

    const ratingStats = await Review.aggregate([
      {
        $match: {
          serviceId: {
            $in: serviceIds,
          },
        },
      },
      {
        $group: {
          _id: "$serviceId",
          totalReviews: {
            $sum: 1,
          },
          averageRating: {
            $avg: "$rating",
          },
        },
      },
    ]);

    const ratingMap = new Map();

    ratingStats.forEach((item) => {
      ratingMap.set(String(item._id), {
        totalReviews: item.totalReviews,
        averageRating: Number(
          Number(item.averageRating).toFixed(1)
        ),
      });
    });

    const servicesWithRatings = services.map(
      (service) => {
        const rating = ratingMap.get(
          String(service._id)
        );

        return {
          ...service,
          averageRating: rating?.averageRating || 0,
          totalReviews: rating?.totalReviews || 0,
        };
      }
    );

    return res.json(servicesWithRatings);
  } catch (error) {
    console.error("GET SERVICES ERROR:", error);

    return res.status(500).json({
      message: "Unable to load services.",
    });
  }
});


// ========================================
// UPDATE SERVICE
// PATCH /api/services/:id
// ========================================


router.patch(
  "/:id",
  authMiddleware,
  requireStaffManagementIfRequested,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID.",
        });
      }

      const service = await Service.findOne({
        _id: id,
        businessId: req.user.id,
        isActive: true,
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found.",
        });
      }

      const {
        name,
        description,
        price,
        duration,
        slotIntervalMinutes,
        bufferMinutes,
      } = req.body;

      // ------------------------------------------
      // VALIDATE ONLY THE FIELDS BEING UPDATED
      // ------------------------------------------

      if (
        name !== undefined &&
        (typeof name !== "string" || !name.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid service name.",
        });
      }

      if (
        price !== undefined &&
        (
          price === null ||
          !Number.isFinite(Number(price)) ||
          Number(price) < 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid service price.",
        });
      }

      if (
        duration !== undefined &&
        ![15, 20, 30, 45, 60].includes(Number(duration))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid service duration.",
        });
      }

      if (
        slotIntervalMinutes !== undefined &&
        ![5, 10, 15, 20, 30].includes(
          Number(slotIntervalMinutes)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid slot interval.",
        });
      }

      if (
        bufferMinutes !== undefined &&
        ![0, 5, 10, 15].includes(Number(bufferMinutes))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid buffer time.",
        });
      }

      // ------------------------------------------
      // UPDATE ONLY PROVIDED FIELDS
      // ------------------------------------------

      if (name !== undefined) {
        service.name = name.trim();
      }

      if (description !== undefined) {
        service.description = description;
      }

      if (price !== undefined) {
        service.price = Number(price);
      }

      if (duration !== undefined) {
        service.duration = Number(duration);
      }

      if (slotIntervalMinutes !== undefined) {
        service.slotIntervalMinutes = Number(
          slotIntervalMinutes
        );
      }

      if (bufferMinutes !== undefined) {
        service.bufferMinutes = Number(bufferMinutes);
      }

      // ------------------------------------------
      // VALIDATE AND UPDATE ELIGIBLE STAFF
      // ------------------------------------------

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "staffIds"
        )
      ) {
        const validation = await validateStaffIds(
          req.body.staffIds,
          req.user.id
        );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.message,
          });
        }

        service.staffIds = validation.staffIds;
      }

      // Healthcare services must always have explicitly selected staff.
// Healthcare services must always have at least one active,
// explicitly selected eligible team member.
const business = await User.findById(req.user.id)
  .select("businessType");

const currentStaffIds = Array.isArray(service.staffIds)
  ? service.staffIds
  : [];

if (requiresExplicitServiceStaff(business)) {
  const activeStaffCount = currentStaffIds.length
    ? await Staff.countDocuments({
        _id: { $in: currentStaffIds },
        businessId: req.user.id,
        isActive: true,
      })
    : 0;

  if (activeStaffCount === 0) {
    return res.status(400).json({
      success: false,
      message:
        "Select at least one active doctor or team member for this healthcare service.",
    });
  }
}

      await service.save();

      return res.json({
        success: true,
        message: "Service updated successfully.",
        service,
      });
    } catch (error) {
      console.error("UPDATE SERVICE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update service.",
      });
    }
  }
);



// ========================================
// DELETE SERVICE
// DELETE /api/services/:id
// ========================================

router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID.",
        });
      }

      const service = await Service.findOneAndUpdate(
        {
          _id: id,
          businessId: req.user.id,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
          },
        },
        {
          new: true,
        }
      );

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found.",
        });
      }

      return res.json({
        success: true,
        message: "Service deleted successfully.",
      });
    } catch (error) {
      console.error("DELETE SERVICE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete service.",
      });
    }
  }
);

export default router;
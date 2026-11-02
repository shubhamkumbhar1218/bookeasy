
import express from "express";
import mongoose from "mongoose";
import Service from "../models/Service.js";
import Staff from "../models/Staff.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { releaseBookingLocks } from "../utils/bookingSlotLocks.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireFeature } from "../middleware/requireFeature.js";

const router = express.Router();

// All Team Management APIs require authentication
// and an active plan with staff_management.
router.use(authMiddleware);
router.use(requireFeature("staff_management"));


// ========================================
// HELPERS
// ========================================

const getBusinessId = (req) => req.user?.id;
const validateServiceIds = async (serviceIds, businessId) => {
  if (!Array.isArray(serviceIds)) {
    const error = new Error("serviceIds must be an array.");
error.statusCode = 400;
throw error;
  }

  const uniqueIds = [...new Set(serviceIds.map(String))];

  for (const id of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid service ID.");
error.statusCode = 400;
throw error;
    }
  }

  const services = await Service.find({
    _id: { $in: uniqueIds },
    businessId,
    isActive: true,
  }).select("_id");

if (services.length !== uniqueIds.length) {
  const error = new Error(
    "One or more selected services are invalid or unavailable."
  );
  error.statusCode = 400;
  throw error;
}

  return uniqueIds;
};

const syncStaffServices = async (
  staffId,
  businessId,
  serviceIds
) => {
  // Remove this staff member from services no longer selected.
  await Service.updateMany(
    {
      businessId,
      staffIds: staffId,
      _id: { $nin: serviceIds },
    },
    {
      $pull: { staffIds: staffId },
    }
  );

  // Add this staff member to newly selected services.
  if (serviceIds.length > 0) {
    await Service.updateMany(
      {
        businessId,
        _id: { $in: serviceIds },
      },
      {
        $addToSet: { staffIds: staffId },
      }
    );
  }
};

const validateWorkingHours = (workingHours) => {
  if (!Array.isArray(workingHours)) {
    return "Working hours must be an array.";
  }

  const seenDays = new Set();

  for (const item of workingHours) {
    if (
      !Number.isInteger(item.dayOfWeek) ||
      item.dayOfWeek < 0 ||
      item.dayOfWeek > 6
    ) {
      return "Invalid working-hours day.";
    }

    if (seenDays.has(item.dayOfWeek)) {
      return "Duplicate working-hours day.";
    }

    seenDays.add(item.dayOfWeek);

    if (typeof item.isAvailable !== "boolean") {
      return "Invalid availability value.";
    }

    if (item.isAvailable) {
      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

      if (
        !timePattern.test(item.startTime || "") ||
        !timePattern.test(item.endTime || "")
      ) {
        return "Working hours must use HH:mm format.";
      }

      if (item.startTime >= item.endTime) {
        return "End time must be later than start time.";
      }
    }
  }

  return null;
};

const cleanStaffInput = (body) => {
  const data = {};

  if (typeof body.name === "string") {
    data.name = body.name.trim();
  }

  if (typeof body.designation === "string") {
    data.designation = body.designation.trim();
  }

  if (typeof body.phone === "string") {
    data.phone = body.phone.trim();
  }

  if (typeof body.email === "string") {
    data.email = body.email.trim().toLowerCase();
  }

  if (typeof body.notes === "string") {
    data.notes = body.notes.trim();
  }

  if (Array.isArray(body.workingHours)) {
    data.workingHours = body.workingHours;
  }

  return data;
};


// Permanently delete a staff member while preserving booking history.
router.delete("/:id", async (req, res) => {
  let session;

  try {
    const { id } = req.params;
    const businessId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID.",
      });
    }

    session = await mongoose.startSession();

    let deletedStaffName = "";
    let unassignedCount = 0;

    await session.withTransaction(async () => {
      const staffMember = await Staff.findOne({
        _id: id,
        businessId,
      }).session(session);

      if (!staffMember) {
        const error = new Error("STAFF_NOT_FOUND");
        throw error;
      }

      deletedStaffName = staffMember.name;

      // Find all active bookings assigned to this staff member.
      const bookings = await Booking.find({
        businessId,
        assignedStaffId: staffMember._id,
        status: { $in: ["pending", "confirmed"] },
      }).session(session);

      for (const booking of bookings) {
        if (!Array.isArray(booking.staffAssignmentHistory)) {
          booking.staffAssignmentHistory = [];
        }

        booking.staffAssignmentHistory.push({
          action: "unassigned",
          staffId: staffMember._id,
          staffName: staffMember.name,
          assignmentType: "automatic",
          changedBy: businessId,
          changedByName: req.user.name || "Business owner",
          changedAt: new Date(),
        });

        booking.assignedStaffId = null;

        // Avoid collisions with the unique index for unassigned
        // active bookings. Availability still checks bookingDate.
        booking.bookingSlot = null;

        await booking.save({ session });

        await releaseBookingLocks({
          bookingId: booking._id,
          session,
        });

        unassignedCount++;
      }

      // Remove this staff member from every service assignment.
      await Service.updateMany(
        {
          businessId,
          staffIds: staffMember._id,
        },
        {
          $pull: { staffIds: staffMember._id },
        },
        { session }
      );

      // Permanently remove the Staff document.
      await Staff.deleteOne(
        {
          _id: staffMember._id,
          businessId,
        },
        { session }
      );
    });

    return res.status(200).json({
      success: true,
      message: `${deletedStaffName} was permanently deleted.`,
      unassignedBookings: unassignedCount,
    });
  } catch (error) {
    console.error("Delete staff error:", error);

    if (error.message === "STAFF_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to delete team member.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});


// ========================================
// GET ALL STAFF FOR LOGGED-IN BUSINESS
// GET /api/staff
// ========================================

router.get("/", async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    const staff = await Staff.find({ businessId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: staff.length,
      staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load team members.",
    });
  }
});


// ========================================
// ADD STAFF MEMBER
// POST /api/staff
// ========================================


router.post("/", async (req, res) => {
  let createdStaffId = null;

  try {
    const businessId = getBusinessId(req);

    if (req.user.role !== "BUSINESS") {
      return res.status(403).json({
        success: false,
        message: "Only business accounts can manage staff.",
      });
    }

    const business = await User.findById(businessId).select("_id");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business account not found.",
      });
    }

    const data = cleanStaffInput(req.body);

    if (!data.name || !data.designation) {
      return res.status(400).json({
        success: false,
        message: "Staff name and designation are required.",
      });
    }

    if (
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (data.workingHours) {
      const validationError = validateWorkingHours(
        data.workingHours
      );

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }
    }

    // Validate selected services.
    const serviceIds = await validateServiceIds(
      req.body.serviceIds || [],
      businessId
    );

    // Create staff member.
    const staff = await Staff.create({
      ...data,
      businessId,
    });

    createdStaffId = staff._id;

    // Assign staff member to selected services.
    await syncStaffServices(
      staff._id,
      businessId,
      serviceIds
    );

    return res.status(201).json({
      success: true,
      message: "Team member added successfully.",
      staff,
    });
  } catch (error) {
    console.error("Add staff error:", error);

    // Avoid leaving an unassigned staff record if service
    // synchronization fails during creation.
    if (createdStaffId) {
      try {
        await Staff.deleteOne({
          _id: createdStaffId,
          businessId: getBusinessId(req),
        });
      } catch (cleanupError) {
        console.error("Staff cleanup error:", cleanupError);
      }
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to add team member.",
    });
  }
});



// ========================================
// UPDATE STAFF MEMBER
// PATCH /api/staff/:id
// ========================================

router.patch("/:id", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID.",
      });
    }

    const data = cleanStaffInput(req.body);

const hasServiceIds = Object.prototype.hasOwnProperty.call(
  req.body,
  "serviceIds"
);

if (Object.keys(data).length === 0 && !hasServiceIds) {
  return res.status(400).json({
    success: false,
    message: "No valid fields provided for update.",
  });
}

    if (data.name !== undefined && !data.name) {
      return res.status(400).json({
        success: false,
        message: "Staff name cannot be empty.",
      });
    }

    if (data.designation !== undefined && !data.designation) {
      return res.status(400).json({
        success: false,
        message: "Designation cannot be empty.",
      });
    }

    if (
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (data.workingHours) {
      const validationError = validateWorkingHours(data.workingHours);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }
    }

    let serviceIds;

if (hasServiceIds) {
  serviceIds = await validateServiceIds(
    req.body.serviceIds,
    businessId
  );
}

    const staff = await Staff.findOneAndUpdate(
      {
        _id: id,
        businessId,
      },
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }
    
    // Synchronize selected services only when serviceIds was provided.
if (hasServiceIds) {
  await syncStaffServices(
    staff._id,
    businessId,
    serviceIds
  );
}

    return res.status(200).json({
      success: true,
      message: "Team member updated successfully.",
      staff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

return res.status(error.statusCode || 500).json({
  success: false,
  message: error.statusCode
    ? error.message
    : "Unable to update team member.",
});
  }
});


// ========================================
// DEACTIVATE STAFF MEMBER
// PATCH /api/staff/:id/deactivate
// ========================================

router.patch("/:id/deactivate", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID.",
      });
    }

    const staff = await Staff.findOneAndUpdate(
      {
        _id: id,
        businessId,
      },
      {
        $set: { isActive: false },
      },
      {
        new: true,
      }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team member deactivated successfully.",
      staff,
    });
  } catch (error) {
    console.error("Deactivate staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to deactivate team member.",
    });
  }
});


// ========================================
// REACTIVATE STAFF MEMBER
// PATCH /api/staff/:id/activate
// ========================================

router.patch("/:id/activate", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID.",
      });
    }

    const staff = await Staff.findOneAndUpdate(
      {
        _id: id,
        businessId,
      },
      {
        $set: { isActive: true },
      },
      {
        new: true,
      }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team member activated successfully.",
      staff,
    });
  } catch (error) {
    console.error("Activate staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to activate team member.",
    });
  }
});

export default router;

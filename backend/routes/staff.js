
import express from "express";
import mongoose from "mongoose";

import Staff from "../models/Staff.js";
import User from "../models/User.js";

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

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
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

    const staff = await Staff.create({
      ...data,
      businessId,
    });

    return res.status(201).json({
      success: true,
      message: "Team member added successfully.",
      staff,
    });
  } catch (error) {
    console.error("Add staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add team member.",
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

    if (Object.keys(data).length === 0) {
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

    return res.status(200).json({
      success: true,
      message: "Team member updated successfully.",
      staff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update team member.",
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

import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Staff from "../models/Staff.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireFeature from "../middleware/requireFeature.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireFeature("staff_management"));

// List this business's staff
router.get("/", async (req, res) => {
  try {
    const staff = await Staff.find({
      businessId: req.user.id,
    }).sort({ createdAt: -1 });

    return res.json({ success: true, staff });
  } catch (error) {
    console.error("List staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load staff.",
    });
  }
});

// Add a staff member
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, designation } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Staff name is required.",
      });
    }

    const staff = await Staff.create({
      businessId: req.user.id,
      name: name.trim(),
      phone: typeof phone === "string" ? phone.trim() : "",
      email: typeof email === "string" ? email.trim().toLowerCase() : "",
      designation:
        typeof designation === "string" && designation.trim()
          ? designation.trim()
          : "Staff",
    });

    return res.status(201).json({
      success: true,
      message: "Staff member added successfully.",
      staff,
    });
  } catch (error) {
    console.error("Create staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add staff.",
    });
  }
});

// Business owner: view a staff member's work history
router.get("/:id/bookings", async (req, res) => {
  try {
    const staff = await Staff.findOne({
      _id: req.params.id,
      businessId: req.user.id,
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    const bookings = await Booking.find({
      businessId: req.user.id,
      staffId: staff._id,
    })
      .populate("serviceId", "name price duration")
      .populate("staffId", "name designation")
      .populate("statusHistory.changedBy", "name")
      .sort({ bookingDate: -1, createdAt: -1 });

    const count = (status) =>
      bookings.filter((booking) => booking.status === status).length;

    return res.json({
      success: true,
      staff: {
        _id: staff._id,
        name: staff.name,
        designation: staff.designation,
      },
      summary: {
        total: bookings.length,
        completed: count("completed"),
        cancelled: count("cancelled"),
        pending: count("pending"),
        confirmed: count("confirmed"),
        noShow: count("no_show"),
      },
      bookings,
    });
  } catch (error) {
    console.error("Staff booking history error:", error);
    return res.status(500).json({
      message: "Failed to load staff booking history",
    });
  }
});


// Update staff details or active status
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID.",
      });
    }

    const allowedFields = ["name", "phone", "email", "designation", "isActive"];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
      if (!updates.name) {
        return res.status(400).json({
          success: false,
          message: "Staff name cannot be empty.",
        });
      }
    }

    for (const field of ["phone", "email", "designation"]) {
      if (typeof updates[field] === "string") {
        updates[field] = updates[field].trim();
      }
    }

    if (typeof updates.email === "string") {
      updates.email = updates.email.toLowerCase();
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "isActive") &&
      typeof updates.isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false.",
      });
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: id, businessId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    return res.json({
      success: true,
      message: "Staff member updated successfully.",
      staff,
    });
  } catch (error) {
    console.error("Update staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update staff.",
    });
  }
});

// Deactivate a staff member without deleting history
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID.",
      });
    }

    const staff = await Staff.findOneAndUpdate(
      {
        _id: req.params.id,
        businessId: req.user.id,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    return res.json({
      success: true,
      message: "Staff member deactivated.",
      staff,
    });
  } catch (error) {
    console.error("Deactivate staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to deactivate staff.",
    });
  }
});

export default router;


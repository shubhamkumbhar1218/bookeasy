import express from "express";
import Notification from "../models/Notification.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// BUSINESS NOTIFICATIONS
// =====================================================

// Get notifications for logged-in business
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      businessId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.log("Get business notifications error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get unread notification count
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      businessId: req.user.id,
      isRead: false,
    });

    res.json({
      count,
    });
  } catch (error) {
    console.log("Unread count error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Mark one business notification as read
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      businessId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    notification.isRead = true;

    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.log("Mark notification read error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Mark ALL business notifications as read
router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        businessId: req.user.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    console.log(
      `Marked ${result.modifiedCount} notifications as read`
    );

    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log("Mark all notifications read error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// CUSTOMER NOTIFICATIONS
// =====================================================

// Get customer notifications
router.get("/customer", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const notifications = await Notification.find({
      customerPhone: phone.trim(),
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.log("Get customer notifications error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Mark customer notification as read
router.patch("/customer/:id/read", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      customerPhone: phone.trim(),
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    notification.isRead = true;

    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.log("Mark customer notification read error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
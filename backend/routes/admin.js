
import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// All routes in this file require an authenticated admin.
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/overview
router.get("/overview", async (req, res) => {
  try {
    const [total, active, suspended, categories] =
      await Promise.all([
        User.countDocuments({ role: "BUSINESS" }),
        User.countDocuments({
          role: "BUSINESS",
          isActive: { $ne: false },
        }),
        User.countDocuments({
          role: "BUSINESS",
          isActive: false,
        }),
        User.distinct("businessType", { role: "BUSINESS" }),
      ]);

    res.json({
      totalOwners: total,
      activeOwners: active,
      suspendedOwners: suspended,
      categories: categories.length,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ message: "Unable to load admin overview" });
  }
});

// GET /api/admin/owners?search=salon
router.get("/owners", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const filter = { role: "BUSINESS" };

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { businessName: regex },
        { phone: regex },
        { businessType: regex },
      ];
    }

    const owners = await User.find(filter)
      .select(
        "name email businessName businessSlug businessType phone address isActive createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({ owners });
  } catch (error) {
    console.error("Admin owners error:", error);
    res.status(500).json({ message: "Unable to load business owners" });
  }
});

// PATCH /api/admin/owners/:id/status
router.patch("/owners/:id/status", async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const owner = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "BUSINESS",
      },
      { $set: { isActive } },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "name email businessName businessType isActive"
    );

    if (!owner) {
      return res.status(404).json({
        message: "Business owner not found",
      });
    }

    res.json({
      message: isActive
        ? "Business owner activated successfully"
        : "Business owner suspended successfully",
      owner,
    });
  } catch (error) {
    console.error("Admin status update error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid business owner ID",
      });
    }

    res.status(500).json({
      message: "Unable to update business owner",
    });
  }
});

export default router;

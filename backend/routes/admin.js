import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import Booking from "../models/Booking.js";

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


/**
 * GET /api/admin/business-booking-stats
 *
 * Examples:
 * ?period=today
 * ?period=thisMonth
 * ?period=lastMonth
 * ?period=allTime
 * ?period=custom&startDate=2026-10-01&endDate=2026-10-14
 */
router.get("/business-booking-stats", async (req, res) => {
  try {
    const period = String(req.query.period || "thisMonth");
    const timeZone = "Asia/Kolkata";

    const getIndiaDate = (date = new Date()) => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);

      const part = (type) =>
        parts.find((item) => item.type === type).value;

      return `${part("year")}-${part("month")}-${part("day")}`;
    };

    // Interpret YYYY-MM-DD as midnight in India.
    const startOfDay = (date) =>
      new Date(`${date}T00:00:00+05:30`);

    const addDays = (date, days) => {
      const [year, month, day] = date.split("-").map(Number);
      const next = new Date(Date.UTC(year, month - 1, day + days));

      return [
        next.getUTCFullYear(),
        String(next.getUTCMonth() + 1).padStart(2, "0"),
        String(next.getUTCDate()).padStart(2, "0"),
      ].join("-");
    };

    let startDate;
    let endDate;

    const today = getIndiaDate();
    const [year, month] = today.split("-").map(Number);
    const thisMonthStart =
      `${year}-${String(month).padStart(2, "0")}-01`;

    if (period === "today") {
      startDate = today;
      endDate = addDays(today, 1);
    } else if (period === "thisMonth") {
      startDate = thisMonthStart;
      endDate =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    } else if (period === "lastMonth") {
      const lastMonthDate = new Date(Date.UTC(year, month - 2, 1));
      const lastYear = lastMonthDate.getUTCFullYear();
      const lastMonth = lastMonthDate.getUTCMonth() + 1;

      startDate =
        `${lastYear}-${String(lastMonth).padStart(2, "0")}-01`;
      endDate = thisMonthStart;
    } else if (period === "custom") {
      startDate = String(req.query.startDate || "");
      const inclusiveEndDate = String(req.query.endDate || "");

      const isValidDate = (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

        const date = new Date(`${value}T00:00:00Z`);

        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      };

      if (
        !isValidDate(startDate) ||
        !isValidDate(inclusiveEndDate) ||
        startDate > inclusiveEndDate
      ) {
        return res.status(400).json({
          message:
            "Provide valid startDate and endDate in YYYY-MM-DD format.",
        });
      }

      // Include the entire end date.
      endDate = addDays(inclusiveEndDate, 1);
    } else if (period !== "allTime") {
      return res.status(400).json({
        message:
          "Invalid period. Use today, thisMonth, lastMonth, allTime, or custom.",
      });
    }

    const match = {};

    if (period !== "allTime") {
      match.bookingDate = {
        $gte: startOfDay(startDate),
        $lt: startOfDay(endDate),
      };
    }

    const [businesses, bookingStats] = await Promise.all([
      User.find({ role: "BUSINESS" })
        .select("_id name businessName businessType")
        .sort({ businessName: 1 })
        .lean(),

      Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$businessId",
            totalBookings: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
              },
            },
            confirmed: {
              $sum: {
                $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const statsByBusiness = new Map(
      bookingStats.map((item) => [String(item._id), item])
    );

    const result = businesses.map((business) => {
      const stats = statsByBusiness.get(String(business._id));

      return {
        _id: String(business._id),
        name: business.name || "",
        businessName: business.businessName || "Unnamed Business",
        businessType: business.businessType || "",
        totalBookings: stats?.totalBookings || 0,
        pending: stats?.pending || 0,
        confirmed: stats?.confirmed || 0,
        completed: stats?.completed || 0,
        cancelled: stats?.cancelled || 0,
      };
    });

    res.json({
      period,
      startDate: period === "allTime" ? null : startDate,
      endDate:
        period === "allTime"
          ? null
          : addDays(endDate, -1),
      totalBusinesses: result.length,
      totalBookings: result.reduce(
        (total, business) => total + business.totalBookings,
        0
      ),
      businesses: result,
    });
  } catch (error) {
    console.error("Admin business booking stats error:", error);
    res.status(500).json({
      message: "Unable to load business booking statistics.",
    });
  }
});


const ADMIN_SUBSCRIPTION_PLANS = {
  FREE: { name: "Free", price: 0, bookingLimit: 30 },
  STARTER: { name: "Starter", price: 299, bookingLimit: null },
  BUSINESS: { name: "Business", price: 499, bookingLimit: null },
  PRO: { name: "Pro", price: 999, bookingLimit: null },
};

// GET /api/admin/subscriptions
// View subscription records and plan counts.
router.get("/subscriptions", async (req, res) => {
  try {
    const { plan, status, search = "" } = req.query;

    const filter = { role: "BUSINESS" };

    if (plan) {
      if (!Object.hasOwn(ADMIN_SUBSCRIPTION_PLANS, String(plan))) {
        return res.status(400).json({ message: "Invalid subscription plan." });
      }
      filter.plan = String(plan);
    }

    if (status) {
      const allowedStatuses = [
        "ACTIVE",
        "CANCELLED",
        "EXPIRED",
        "PAST_DUE",
      ];

      if (!allowedStatuses.includes(String(status))) {
        return res.status(400).json({ message: "Invalid subscription status." });
      }
      filter.subscriptionStatus = String(status);
    }

    const searchText = String(search).trim();

    if (searchText) {
      const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { businessName: regex },
        { businessSlug: regex },
      ];
    }

    const [businesses, totalBusinesses, planCounts, statusCounts] =
      await Promise.all([
        User.find(filter)
          .select(
            "name email businessName businessSlug businessType plan subscriptionStatus subscriptionStartDate subscriptionEndDate subscriptionPaymentId isActive createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        User.countDocuments({ role: "BUSINESS" }),

        User.aggregate([
          { $match: { role: "BUSINESS" } },
          {
            $group: {
              _id: { $ifNull: ["$plan", "FREE"] },
              count: { $sum: 1 },
            },
          },
        ]),

        User.aggregate([
          { $match: { role: "BUSINESS" } },
          {
            $group: {
              _id: { $ifNull: ["$subscriptionStatus", "ACTIVE"] },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const countsByPlan = Object.fromEntries(
      planCounts.map((item) => [item._id, item.count])
    );

    const countsByStatus = Object.fromEntries(
      statusCounts.map((item) => [item._id, item.count])
    );

    res.json({
      totalBusinesses,
      returnedBusinesses: businesses.length,
      plans: Object.entries(ADMIN_SUBSCRIPTION_PLANS).map(([id, details]) => ({
        id,
        ...details,
        count: countsByPlan[id] || 0,
      })),
      statusCounts: countsByStatus,
      businesses: businesses.map((business) => ({
        ...business,
        plan: business.plan || "FREE",
        subscriptionStatus: business.subscriptionStatus || "ACTIVE",
        planDetails:
          ADMIN_SUBSCRIPTION_PLANS[business.plan || "FREE"] ||
          ADMIN_SUBSCRIPTION_PLANS.FREE,
      })),
    });
  } catch (error) {
    console.error("Admin subscriptions error:", error);
    res.status(500).json({ message: "Unable to load subscriptions." });
  }
});

// PATCH /api/admin/subscriptions/:id
// Manually assign a plan. This does not process or verify a payment.
router.patch("/subscriptions/:id", async (req, res) => {
  try {
    const { plan, subscriptionStatus } = req.body;

    if (
      typeof plan !== "string" ||
      !Object.hasOwn(ADMIN_SUBSCRIPTION_PLANS, plan)
    ) {
      return res.status(400).json({ message: "Select a valid subscription plan." });
    }

    const allowedStatuses = [
      "ACTIVE",
      "CANCELLED",
      "EXPIRED",
      "PAST_DUE",
    ];

    if (
      subscriptionStatus !== undefined &&
      !allowedStatuses.includes(subscriptionStatus)
    ) {
      return res.status(400).json({ message: "Invalid subscription status." });
    }

    if (plan === "FREE" && subscriptionStatus && subscriptionStatus !== "ACTIVE") {
      return res.status(400).json({
        message: "The Free plan must use ACTIVE status in this version.",
      });
    }

    const owner = await User.findOne({
      _id: req.params.id,
      role: "BUSINESS",
    });

    if (!owner) {
      return res.status(404).json({ message: "Business owner not found." });
    }

    const previousPlan = owner.plan || "FREE";
    const now = new Date();

    owner.plan = plan;

    if (plan === "FREE") {
      owner.subscriptionStatus = "ACTIVE";
      owner.subscriptionStartDate = null;
      owner.subscriptionEndDate = null;
      owner.subscriptionPaymentId = "";
    } else {
      // Manual admin assignment: grants plan access for one month.
      // This is not evidence that the business has paid.
      owner.subscriptionStatus = subscriptionStatus || "ACTIVE";

      if (previousPlan !== plan || !owner.subscriptionStartDate) {
        owner.subscriptionStartDate = now;
        owner.subscriptionEndDate = new Date(now);
        owner.subscriptionEndDate.setMonth(
          owner.subscriptionEndDate.getMonth() + 1
        );
      } else if (subscriptionStatus !== undefined) {
        owner.subscriptionStatus = subscriptionStatus;
      }
    }

    await owner.save();

    res.json({
      message: `Subscription updated to ${plan}.`,
      paymentProcessed: false,
      business: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        plan: owner.plan,
        subscriptionStatus: owner.subscriptionStatus,
        subscriptionStartDate: owner.subscriptionStartDate,
        subscriptionEndDate: owner.subscriptionEndDate,
      },
    });
  } catch (error) {
    console.error("Admin subscription update error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid business owner ID." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Unable to update subscription." });
  }
});



export default router;

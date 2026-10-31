import express from "express";
import mongoose from "mongoose";

import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import PLANS from "../config/plans.js";
import { normalizePhone } from "../utils/normalizePhone.js";
import LoyaltyProgram from "../models/LoyaltyProgram.js";
import CustomerLoyalty from "../models/CustomerLoyalty.js";
import LoyaltyReward from "../models/LoyaltyReward.js";
import LoyaltyTransaction from "../models/LoyaltyTransaction.js";


const router = express.Router();

// ========================================
// CUSTOMER LOYALTY LOOKUP
// Public access using phone number only.
// No OTP or customer login.
// ========================================

// GET /api/loyalty/customer?businessId=...&phone=...
router.get("/customer", async (req, res) => {
  try {
    const { businessId, phone } = req.query;

    if (!businessId || !phone) {
      return res.status(400).json({
        success: false,
        message: "Business ID and phone number are required",
      });
    }

    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid business ID",
      });
    }

    const customerPhone = normalizePhone(phone);

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Valid phone number is required",
      });
    }

// Previously earned rewards must remain visible.
const program = await LoyaltyProgram.findOne({
  businessId,
}).select(
  "name isActive visitsRequired rewardType rewardValue rewardExpiryDays"
).lean();
    // Find this customer's loyalty account for this business only.
    const customer = await CustomerLoyalty.findOne({
      businessId,
      customerPhone,
    }).select(
      "_id customerName completedVisits lifetimeVisits totalRewardsEarned totalRewardsRedeemed"
    ).lean();

    if (!customer) {
      return res.json({
        success: true,
        program,
        customer: null,
        rewards: [],
        message: "No loyalty visits found for this customer",
      });
    }

    const rewards = await LoyaltyReward.find({
      businessId,
      customerLoyaltyId: customer._id,
    })
      .select(
        "_id rewardType rewardValue status earnedAt expiresAt redeemedAt"
      )
      .sort({ earnedAt: -1 })
      .lean();

    // Calculate effective expiry status without exposing other customers.
    const now = new Date();

    const formattedRewards = rewards.map((reward) => ({
      ...reward,
      status:
        reward.status === "available" &&
        reward.expiresAt &&
        new Date(reward.expiresAt) <= now
          ? "expired"
          : reward.status,
    }));

    return res.json({
      success: true,
      program,
      customer,
      rewards: formattedRewards,
    });
  } catch (error) {
    console.error("Customer loyalty lookup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load loyalty information",
    });
  }
});

// ========================================
// BUSINESS OWNER AUTHENTICATION
// All routes below this line require owner login.
// ========================================


router.use(authMiddleware);

// Verify the logged-in business owner.
function isBusinessOwner(req) {
  return req.user?.role === "BUSINESS";
}

// Verify active Premium entitlement.
async function hasLoyaltyAccess(userId) {
  const owner = await User.findById(userId)
    .select("plan subscriptionStatus subscriptionEndDate");

  const plan = PLANS[String(owner?.plan || "FREE").toUpperCase()];

  return Boolean(
    plan?.features?.includes("loyalty_program") &&
    owner?.subscriptionStatus === "ACTIVE" &&
    owner?.subscriptionEndDate &&
    new Date(owner.subscriptionEndDate) > new Date()
  );
}

// GET /api/loyalty/program
router.get("/program", async (req, res) => {
  try {
    if (!isBusinessOwner(req)) {
      return res.status(403).json({
        success: false,
        message: "Business owner access required",
      });
    }

    const program = await LoyaltyProgram.findOne({
      businessId: req.user.id,
    });

    return res.json({
      success: true,
      program,
    });
  } catch (error) {
    console.error("Get loyalty program error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load loyalty program",
    });
  }
});

// PUT /api/loyalty/program
router.put("/program", async (req, res) => {
  try {
    if (!isBusinessOwner(req)) {
      return res.status(403).json({
        success: false,
        message: "Business owner access required",
      });
    }

    if (!(await hasLoyaltyAccess(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: "An active Premium subscription is required",
      });
    }

    const {
      name,
      isActive,
      visitsRequired,
      rewardType,
      rewardValue,
      rewardExpiryDays,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 80 ||
      typeof isActive !== "boolean" ||
      !Number.isInteger(Number(visitsRequired)) ||
      Number(visitsRequired) < 2 ||
      Number(visitsRequired) > 100 ||
      !["fixed", "percentage"].includes(rewardType) ||
      !Number.isFinite(Number(rewardValue)) ||
      Number(rewardValue) < 1 ||
      (rewardType === "percentage" && Number(rewardValue) > 100) ||
      (
        rewardExpiryDays !== null &&
        (
          !Number.isInteger(Number(rewardExpiryDays)) ||
          Number(rewardExpiryDays) < 1 ||
          Number(rewardExpiryDays) > 3650
        )
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid loyalty program settings",
      });
    }

    const program = await LoyaltyProgram.findOneAndUpdate(
      { businessId: req.user.id },
      {
        $set: {
          name: name.trim(),
          isActive,
          visitsRequired: Number(visitsRequired),
          rewardType,
          rewardValue: Number(rewardValue),
          rewardExpiryDays:
            rewardExpiryDays === null
              ? null
              : Number(rewardExpiryDays),
        },
        $setOnInsert: {
          businessId: req.user.id,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      message: "Loyalty program saved successfully",
      program,
    });
  } catch (error) {
    console.error("Save loyalty program error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save loyalty program",
    });
  }
});

// GET /api/loyalty/customers
router.get("/customers", async (req, res) => {
  try {
    if (!isBusinessOwner(req)) {
      return res.status(403).json({
        success: false,
        message: "Business owner access required",
      });
    }

    const customers = await CustomerLoyalty.find({
      businessId: req.user.id,
    }).sort({ updatedAt: -1 }).lean();

    return res.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Get loyalty customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load loyalty customers",
    });
  }
});

// GET /api/loyalty/rewards
router.get("/rewards", async (req, res) => {
  try {
    if (!isBusinessOwner(req)) {
      return res.status(403).json({
        success: false,
        message: "Business owner access required",
      });
    }

    const allowedStatuses = ["available", "redeemed", "expired"];
    const status = req.query.status;

    const filter = {
      businessId: req.user.id,
    };

    if (status && allowedStatuses.includes(status)) {
      filter.status = status;
    }

    const rewards = await LoyaltyReward.find(filter)
      .sort({ earnedAt: -1 })
      .lean();

    return res.json({
      success: true,
      rewards,
    });
  } catch (error) {
    console.error("Get loyalty rewards error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load loyalty rewards",
    });
  }
});

// PATCH /api/loyalty/rewards/:rewardId/redeem
// Only the owning business can redeem a reward.
router.patch("/rewards/:rewardId/redeem", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    if (!isBusinessOwner(req)) {
      return res.status(403).json({
        success: false,
        message: "Business owner access required",
      });
    }

    if (!mongoose.isValidObjectId(req.params.rewardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reward ID",
      });
    }

    let redeemedReward = null;
    let expired = false;

    await session.withTransaction(async () => {
      const now = new Date();

      redeemedReward = await LoyaltyReward.findOneAndUpdate(
        {
          _id: req.params.rewardId,
          businessId: req.user.id,
          status: "available",
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: now } },
          ],
        },
        {
          $set: {
            status: "redeemed",
            redeemedAt: now,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (redeemedReward) {
        await CustomerLoyalty.updateOne(
          {
            _id: redeemedReward.customerLoyaltyId,
            businessId: req.user.id,
          },
          {
            $inc: { totalRewardsRedeemed: 1 },
          },
          { session }
        );

        await LoyaltyTransaction.create(
          [{
            businessId: req.user.id,
            customerLoyaltyId: redeemedReward.customerLoyaltyId,
            rewardId: redeemedReward._id,
            type: "reward_redeemed",
            description: "Reward redeemed by business owner",
            actorId: req.user.id,
          }],
          { session }
        );

        return;
      }

      // If the reward exists but has expired, mark it expired.
      const expiredReward = await LoyaltyReward.findOneAndUpdate(
        {
          _id: req.params.rewardId,
          businessId: req.user.id,
          status: "available",
          expiresAt: { $ne: null, $lte: now },
        },
        {
          $set: { status: "expired" },
        },
        {
          new: true,
          session,
        }
      );

      if (expiredReward) {
        expired = true;

        await LoyaltyTransaction.create(
          [{
            businessId: req.user.id,
            customerLoyaltyId: expiredReward.customerLoyaltyId,
            rewardId: expiredReward._id,
            type: "reward_expired",
            description: "Reward expired",
            actorId: req.user.id,
          }],
          { session }
        );
      }
    });

    if (expired) {
      return res.status(400).json({
        success: false,
        message: "This reward has expired",
      });
    }

    if (!redeemedReward) {
      return res.status(400).json({
        success: false,
        message: "Reward is unavailable or has already been redeemed",
      });
    }

    return res.json({
      success: true,
      message: "Reward redeemed successfully",
      reward: redeemedReward,
    });
  } catch (error) {
    console.error("Redeem loyalty reward error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to redeem reward",
    });
  } finally {
    await session.endSession();
  }
});

export default router;

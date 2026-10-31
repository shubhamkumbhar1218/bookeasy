import mongoose from "mongoose";
import PLANS from "../config/plans.js";
import User from "../models/User.js";

export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;

      if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({
          success: false,
          message: "Please log in again.",
        });
      }

      // Read the latest subscription directly from MongoDB.
      const user = await User.findById(userId).select(
        "role accountStatus isActive plan subscriptionStatus subscriptionEndDate"
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User account not found. Please log in again.",
        });
      }

      if (
        user.role !== "BUSINESS" ||
        user.accountStatus !== "ACTIVE" ||
        user.isActive === false
      ) {
        return res.status(403).json({
          success: false,
          message: "Your business account cannot access this feature.",
        });
      }

      const planName = String(user.plan || "FREE").toUpperCase();
      const plan = PLANS[planName];

      if (!plan) {
        return res.status(403).json({
          success: false,
          message: "Unable to verify your subscription plan.",
          upgradeRequired: true,
        });
      }

      // The feature must be included in the selected plan.
      const featureIncluded =
        Array.isArray(plan.features) &&
        plan.features.includes(featureName);

      if (!featureIncluded) {
        return res.status(403).json({
          success: false,
          message: "Upgrade your plan to access this feature.",
          feature: featureName,
          currentPlan: planName,
          upgradeRequired: true,
        });
      }

      // Paid features require a currently active subscription.
      if (user.subscriptionStatus !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "Your subscription is not active.",
          currentPlan: planName,
          upgradeRequired: true,
        });
      }

      // Paid subscriptions must have a valid future expiry date.
      const expiry = user.subscriptionEndDate;

      if (
        !(expiry instanceof Date) ||
        Number.isNaN(expiry.getTime()) ||
        expiry.getTime() <= Date.now()
      ) {
        return res.status(403).json({
          success: false,
          message: "Your subscription has expired. Renew to continue.",
          currentPlan: planName,
          upgradeRequired: true,
        });
      }

      return next();
    } catch (error) {
      console.error("Feature access verification error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to verify feature access.",
      });
    }
  };
};

export default requireFeature;

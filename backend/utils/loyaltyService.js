
import mongoose from "mongoose";
import User from "../models/User.js";
import PLANS from "../config/plans.js";

import LoyaltyProgram from "../models/LoyaltyProgram.js";
import CustomerLoyalty from "../models/CustomerLoyalty.js";
import LoyaltyReward from "../models/LoyaltyReward.js";
import LoyaltyTransaction from "../models/LoyaltyTransaction.js";

import { normalizePhone } from "./normalizePhone.js";

export async function awardLoyaltyVisit(booking) {
  if (booking.status !== "completed") {
    return {
      awarded: false,
      reason: "BOOKING_NOT_COMPLETED",
    };
  }

  const session = await mongoose.startSession();

  let result = {
    awarded: false,
    reason: "UNKNOWN",
    reward: null,
  };

  try {
    await session.withTransaction(async () => {
      // 1. Verify the business has an active Premium entitlement.
      const owner = await User.findById(booking.businessId)
        .select("plan subscriptionStatus subscriptionEndDate")
        .session(session);

      const plan = PLANS[String(owner?.plan || "FREE").toUpperCase()];

      const subscriptionIsActive =
        owner?.subscriptionStatus === "ACTIVE" &&
        owner?.subscriptionEndDate &&
        new Date(owner.subscriptionEndDate) > new Date();

      if (
        !plan?.features?.includes("loyalty_program") ||
        !subscriptionIsActive
      ) {
        result = {
          awarded: false,
          reason: "PLAN_NOT_ELIGIBLE",
          reward: null,
        };
        return;
      }

      // 2. Check that the loyalty program is enabled.
      const program = await LoyaltyProgram.findOne({
        businessId: booking.businessId,
        isActive: true,
      }).session(session);

      if (!program) {
        result = {
          awarded: false,
          reason: "PROGRAM_INACTIVE",
          reward: null,
        };
        return;
      }

      // 3. Normalize customer phone.
      const customerPhone = normalizePhone(booking.customerPhone);

      if (!customerPhone) {
        result = {
          awarded: false,
          reason: "INVALID_PHONE",
          reward: null,
        };
        return;
      }

      // 4. Find or create the customer loyalty account.
      let customer = await CustomerLoyalty.findOne({
        businessId: booking.businessId,
        customerPhone,
      }).session(session);

      if (!customer) {
        [customer] = await CustomerLoyalty.create(
          [{
            businessId: booking.businessId,
            customerPhone,
            customerName: booking.customerName || "",
          }],
          { session }
        );
      }

      // 5. Prevent duplicate visit credits for this booking.
      const existingTransaction = await LoyaltyTransaction.findOne({
        bookingId: booking._id,
        type: "visit_earned",
      }).session(session);

      if (existingTransaction) {
        result = {
          awarded: false,
          reason: "ALREADY_COUNTED",
          reward: null,
        };
        return;
      }

      // 6. Record the completed visit.
      await LoyaltyTransaction.create(
        [{
          businessId: booking.businessId,
          customerLoyaltyId: customer._id,
          bookingId: booking._id,
          type: "visit_earned",
          description: "Completed appointment visit",
        }],
        { session }
      );

      customer.customerName =
        booking.customerName || customer.customerName;

      customer.completedVisits += 1;
      customer.lifetimeVisits += 1;

      let reward = null;

      // 7. Issue a reward when the visit threshold is reached.
      if (customer.completedVisits >= program.visitsRequired) {
        const earnedAt = new Date();

        const expiresAt = program.rewardExpiryDays
          ? new Date(
              earnedAt.getTime() +
              program.rewardExpiryDays * 24 * 60 * 60 * 1000
            )
          : null;

        [reward] = await LoyaltyReward.create(
          [{
            businessId: booking.businessId,
            customerLoyaltyId: customer._id,
            customerPhone,
            rewardType: program.rewardType,
            rewardValue: program.rewardValue,
            earnedAt,
            expiresAt,
          }],
          { session }
        );

        customer.completedVisits = 0;
        customer.totalRewardsEarned += 1;

        await LoyaltyTransaction.create(
          [{
            businessId: booking.businessId,
            customerLoyaltyId: customer._id,
            rewardId: reward._id,
            type: "reward_earned",
            description: "Loyalty reward earned",
          }],
          { session }
        );
      }

      // 8. Save customer progress.
      await customer.save({ session });

      result = {
        awarded: true,
        reason: "VISIT_AWARDED",
        completedVisits: customer.completedVisits,
        visitsRequired: program.visitsRequired,
        lifetimeVisits: customer.lifetimeVisits,
        reward,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

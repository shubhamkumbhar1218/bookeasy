
import mongoose from "mongoose";

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerLoyaltyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerLoyalty",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoyaltyReward",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "visit_earned",
        "reward_earned",
        "reward_redeemed",
        "reward_expired",
        "visit_reversed",
        "manual_adjustment",
      ],
      required: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 250,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// A booking can generate only one visit-credit transaction.
loyaltyTransactionSchema.index(
  { bookingId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingId: { $type: "objectId" },
      type: "visit_earned",
    },
  }
);

export default mongoose.model(
  "LoyaltyTransaction",
  loyaltyTransactionSchema
);

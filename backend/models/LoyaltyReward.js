
import mongoose from "mongoose";

const loyaltyRewardSchema = new mongoose.Schema(
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
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    rewardType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
    },
    rewardValue: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["available", "redeemed", "expired"],
      default: "available",
      index: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
    redeemedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  { timestamps: true }
);

loyaltyRewardSchema.index({
  businessId: 1,
  customerLoyaltyId: 1,
  status: 1,
});

export default mongoose.model("LoyaltyReward", loyaltyRewardSchema);

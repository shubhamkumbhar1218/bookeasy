
import mongoose from "mongoose";

const customerLoyaltySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    completedVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRewardsEarned: {
      type: Number,
      default: 0,
    },
    totalRewardsRedeemed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

customerLoyaltySchema.index(
  { businessId: 1, customerPhone: 1 },
  { unique: true }
);

export default mongoose.model("CustomerLoyalty", customerLoyaltySchema);

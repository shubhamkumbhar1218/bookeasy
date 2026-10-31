
import mongoose from "mongoose";

const loyaltyProgramSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "Royaltoi Rewards",
      trim: true,
      maxlength: 80,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    visitsRequired: {
      type: Number,
      required: true,
      default: 5,
      min: 2,
      max: 100,
    },
    rewardType: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    rewardValue: {
      type: Number,
      required: true,
      default: 100,
      min: 1,
    },
    rewardExpiryDays: {
      type: Number,
      default: null,
      min: 1,
      max: 3650,
    },
  },
  { timestamps: true }
);

loyaltyProgramSchema.pre("validate", function () {
  if (this.rewardType === "percentage" && this.rewardValue > 100) {
    this.invalidate("rewardValue", "Percentage cannot exceed 100.");
  }
});

export default mongoose.model("LoyaltyProgram", loyaltyProgramSchema);

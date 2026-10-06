import mongoose from "mongoose";

const pushTokenSchema = new mongoose.Schema(
  {
    expoPushToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Business owner receiving push notifications
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Customer receiving push notifications
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    platform: {
      type: String,
      enum: ["android", "ios", "unknown"],
      default: "unknown",
    },
  },
  {
    timestamps: true,
  }
);

const PushToken = mongoose.model(
  "PushToken",
  pushTokenSchema
);

export default PushToken;
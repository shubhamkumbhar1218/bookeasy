
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // BookEasy's unique subscription reference
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    // Cashfree's subscription reference and checkout session
    cashfreeSubscriptionId: {
      type: String,
      default: "",
    },
    subscriptionSessionId: {
      type: String,
      default: "",
    },

    plan: {
      type: String,
      enum: ["STARTER", "BUSINESS", "PRO"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "PENDING",
        "ACTIVE",
        "PAST_DUE",
        "CANCELLED",
        "EXPIRED",
        "FAILED",
      ],
      default: "CREATED",
      required: true,
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    lastPaymentId: {
      type: String,
      default: "",
    },
    lastPaymentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Business receiving notification
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Customer receiving notification
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "new_booking",
        "booking_confirmed",
        "booking_cancelled",
        "booking_completed",
        
        "booking_rescheduled",
        "appointment_reminder_24h",
        "appointment_reminder_1h",

        "booking_usage_41",
"booking_limit_reached",
"subscription_expiry_3d",
"subscription_expiry_1d",
"subscription_expired",

      ],
      required: true,
    },

    dedupeKey: {
  type: String,
  default: undefined,
  unique: true,
  sparse: true,
},

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically delete notifications 90 days after creation
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;
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
      ],
      required: true,
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
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;

import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    // Automatically or manually assigned team member
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Track staff assignment and reassignment history
    staffAssignmentHistory: [
      {
        action: {
          type: String,
          enum: ["assigned", "reassigned", "unassigned"],
          required: true,
        },

        staffId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
          default: null,
        },

        staffName: {
          type: String,
          default: "",
          trim: true,
        },

        assignmentType: {
          type: String,
          enum: ["automatic", "manual"],
          default: "automatic",
        },

        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },

        changedByName: {
          type: String,
          default: "System",
          trim: true,
        },

        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    bookingSlot: {
      type: String,
      required: false,
    },

    // Automated reminder tracking
    reminder24hSentAt: {
      type: Date,
      default: null,
    },

    reminder1hSentAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      default: "pending",
    },

    // Existing booking status history
    statusHistory: [
      {
        action: {
          type: String,
          enum: [
            "created",
            "rescheduled",
            "confirmed",
            "cancelled",
            "completed",
            "no_show",
            "status_changed",
          ],
          default: "status_changed",
        },

        status: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "cancelled",
            "completed",
            "no_show",
          ],
          default: null,
        },

        oldBookingDate: {
          type: Date,
          default: null,
        },

        newBookingDate: {
          type: Date,
          default: null,
        },

        oldBookingSlot: {
          type: String,
          default: "",
        },

        newBookingSlot: {
          type: String,
          default: "",
        },

        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },

        changedByName: {
          type: String,
          default: "Unknown",
          trim: true,
        },

        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Existing unique index — intentionally unchanged

bookingSchema.index(
  { businessId: 1, bookingSlot: 1 },
  {
    unique: true,
    name: "unique_unassigned_business_booking_slot",
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed"] },
      bookingSlot: { $type: "string" },
      assignedStaffId: null,
    },
  }
);


const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;

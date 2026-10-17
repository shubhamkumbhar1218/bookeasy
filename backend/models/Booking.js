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
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index(
  {
    businessId: 1,
    bookingSlot: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["pending", "confirmed"],
      },
    },
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
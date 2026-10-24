
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Actual appointment duration.
    duration: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
      enum: [15, 20, 30, 45, 60],
    },

    // Minutes between possible appointment start times.
    slotIntervalMinutes: {
      type: Number,
      required: true,
      default: 30,
      enum: [5, 10, 15, 20, 30],
    },

    // Extra blocked time after the appointment.
    bufferMinutes: {
      type: Number,
      required: true,
      default: 0,
      enum: [0, 5, 10, 15],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;

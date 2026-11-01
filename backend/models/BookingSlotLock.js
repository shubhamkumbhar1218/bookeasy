
import mongoose from "mongoose";

const bookingSlotLockSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // One record represents one occupied minute.
    // The time must be rounded down to the minute.
    minuteStart: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "booking_slot_locks",
  }
);

// A staff member can have only one booking lock
// for a particular minute.
bookingSlotLockSchema.index(
  {
    staffId: 1,
    minuteStart: 1,
  },
  {
    unique: true,
    name: "unique_staff_minute_lock",
  }
);

// Allows all locks belonging to a booking
// to be found and released together.
bookingSlotLockSchema.index(
  {
    bookingId: 1,
  },
  {
    name: "booking_lock_lookup",
  }
);

// Useful for business-level lock inspection.
bookingSlotLockSchema.index({
  businessId: 1,
  minuteStart: 1,
});

const BookingSlotLock =
  mongoose.models.BookingSlotLock ||
  mongoose.model("BookingSlotLock", bookingSlotLockSchema);

export default BookingSlotLock;

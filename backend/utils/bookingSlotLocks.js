
import mongoose from "mongoose";
import BookingSlotLock from "../models/BookingSlotLock.js";

const LOCK_INTERVAL_MINUTES = 5;
const MINUTE_MS = 60 * 1000;

/**
 * Generate five-minute lock buckets for an appointment.
 *
 * Buffer is applied after the appointment, matching
 * BookEasy's existing scheduling rules.
 */
export const getBookingLockMinutes = ({
  startTime,
  endTime,
  bufferMinutes = 0,
}) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const buffer = Number(bufferMinutes);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    !Number.isInteger(buffer) ||
    ![0, 5, 10, 15].includes(buffer)
  ) {
    throw new Error("Invalid booking time range or buffer.");
  }

  const intervalMs = LOCK_INTERVAL_MINUTES * MINUTE_MS;

  // Round outward so no occupied time is left unlocked.
  const occupiedStart =
    Math.floor(start.getTime() / intervalMs) * intervalMs;

  const occupiedEnd =
    Math.ceil(
      (end.getTime() + buffer * MINUTE_MS) / intervalMs
    ) * intervalMs;

  const minutes = [];

  for (
    let timestamp = occupiedStart;
    timestamp < occupiedEnd;
    timestamp += intervalMs
  ) {
    minutes.push(new Date(timestamp));
  }

  return minutes;
};

/**
 * Reserve staff time.
 * Must run inside the booking transaction.
 */
export const reserveStaffBookingLocks = async ({
  businessId,
  staffId,
  bookingId,
  startTime,
  endTime,
  bufferMinutes = 0,
  session,
}) => {
  if (!session) {
    throw new Error("MongoDB transaction session is required.");
  }

  if (
    !mongoose.isValidObjectId(businessId) ||
    !mongoose.isValidObjectId(staffId) ||
    !mongoose.isValidObjectId(bookingId)
  ) {
    throw new Error("Invalid booking lock reference.");
  }

  const minutes = getBookingLockMinutes({
    startTime,
    endTime,
    bufferMinutes,
  });

  await BookingSlotLock.insertMany(
    minutes.map((minuteStart) => ({
      businessId,
      staffId,
      bookingId,
      minuteStart,
    })),
    {
      session,
      ordered: true,
    }
  );

  return minutes.length;
};

/**
 * Release all locks for a booking.
 * Must run inside the status-change or rescheduling transaction.
 */
export const releaseBookingLocks = async ({
  bookingId,
  session,
}) => {
  if (!session) {
    throw new Error("MongoDB transaction session is required.");
  }

  if (!mongoose.isValidObjectId(bookingId)) {
    throw new Error("Invalid booking ID.");
  }

  const result = await BookingSlotLock.deleteMany(
    { bookingId },
    { session }
  );

  return result.deletedCount || 0;
};

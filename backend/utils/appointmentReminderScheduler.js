
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import { sendPushForNotification } from "./sendPushNotification.js";

const CHECK_INTERVAL_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

let isRunning = false;

function formatAppointmentDate(date) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function sendReminder(booking, reminderType) {
  const is24Hour = reminderType === "24h";

  const trackingField = is24Hour
    ? "reminder24hSentAt"
    : "reminder1hSentAt";

  // Atomically claim this reminder so overlapping scheduler
  // runs cannot send it twice.
  const claimedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: { $in: ["pending", "confirmed"] },
      bookingDate: { $gt: new Date() },
      [trackingField]: null,
    },
    {
      $set: { [trackingField]: new Date() },
    },
    { new: true }
  );

  if (!claimedBooking) return;

  try {
    const service = await Booking.findById(booking._id)
      .populate("serviceId", "name");

    if (!service || !service.serviceId) {
      throw new Error("Booking service not found");
    }

    const serviceName = service.serviceId.name || "appointment";
    const appointmentTime = formatAppointmentDate(
      claimedBooking.bookingDate
    );

    const notification = await Notification.create({
      customerPhone: claimedBooking.customerPhone,
      type: is24Hour
        ? "appointment_reminder_24h"
        : "appointment_reminder_1h",
      title: is24Hour
        ? "Appointment tomorrow"
        : "Appointment in 1 hour",
      message: is24Hour
        ? `Reminder: Your ${serviceName} appointment is scheduled for ${appointmentTime}.`
        : `Your ${serviceName} appointment is in about 1 hour, at ${appointmentTime}.`,
      bookingId: claimedBooking._id,
    });

    await sendPushForNotification(notification);

    console.log(
      `BookEasy: ${reminderType} reminder sent for booking ${claimedBooking._id}`
    );
  } catch (error) {
    // Allow a retry if creating/sending the reminder failed.
    await Booking.updateOne(
      { _id: claimedBooking._id },
      { $set: { [trackingField]: null } }
    );

    console.error(
      `BookEasy: ${reminderType} reminder failed for booking ${claimedBooking._id}:`,
      error
    );
  }
}

async function checkAppointmentReminders() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + ONE_HOUR_MS);
    const twentyFourHoursFromNow = new Date(
      now.getTime() + TWENTY_FOUR_HOURS_MS
    );

    // Only future appointments that are still active.
    // The scheduler catches up after a restart, but skips a
    // late 24-hour reminder once the appointment is within 1 hour.
    const bookings = await Booking.find({
      status: { $in: ["pending", "confirmed"] },
      bookingDate: {
        $gt: now,
        $lte: twentyFourHoursFromNow,
      },
      $or: [
        { reminder24hSentAt: null },
        { reminder1hSentAt: null },
      ],
    }).select(
      "_id customerPhone bookingDate status reminder24hSentAt reminder1hSentAt"
    );

    for (const booking of bookings) {
      const timeUntilAppointment =
        new Date(booking.bookingDate).getTime() - Date.now();

      if (
        timeUntilAppointment <= TWENTY_FOUR_HOURS_MS &&
        timeUntilAppointment > ONE_HOUR_MS &&
        !booking.reminder24hSentAt
      ) {
        await sendReminder(booking, "24h");
      }

      if (
        timeUntilAppointment > 0 &&
        timeUntilAppointment <= ONE_HOUR_MS &&
        !booking.reminder1hSentAt
      ) {
        await sendReminder(booking, "1h");
      }
    }
  } catch (error) {
    console.error("BookEasy reminder scheduler error:", error);
  } finally {
    isRunning = false;
  }
}

export function startAppointmentReminderScheduler() {
  console.log("BookEasy: appointment reminder scheduler started");

  // Check once at startup and then every minute.
  void checkAppointmentReminders();
  setInterval(() => {
    void checkAppointmentReminders();
  }, CHECK_INTERVAL_MS);
}

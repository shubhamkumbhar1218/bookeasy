
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import PLANS from "../config/plans.js";
import { sendPushForNotification } from "./sendPushNotification.js";

const CHECK_INTERVAL_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

let isRunning = false;
let schedulerStarted = false;

function formatAppointmentDate(date) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Only active Business/Pro subscriptions with the
 * automated_reminders feature can receive these reminders.
 */
async function getEligibleBusinessIds(now = new Date()) {
  const users = await User.find({
    role: "BUSINESS",
    accountStatus: "ACTIVE",
    isActive: { $ne: false },
    plan: { $in: ["STARTER", "BUSINESS", "PRO"] },
    subscriptionStatus: "ACTIVE",
    subscriptionEndDate: { $gt: now },
  }).select("_id plan");

  return users
    .filter((user) => {
      const plan = PLANS[user.plan];

      return (
        Array.isArray(plan?.features) &&
        plan.features.includes("automated_reminders")
      );
    })
    .map((user) => user._id);
}

async function isBusinessEligible(businessId) {
  const now = new Date();

  const user = await User.findOne({
    _id: businessId,
    role: "BUSINESS",
    accountStatus: "ACTIVE",
    isActive: { $ne: false },
    plan: { $in: ["STARTER", "BUSINESS", "PRO"] },
    subscriptionStatus: "ACTIVE",
    subscriptionEndDate: { $gt: now },
  }).select("_id plan");

  if (!user) return false;

  const plan = PLANS[user.plan];

  return (
    Array.isArray(plan?.features) &&
    plan.features.includes("automated_reminders")
  );
}

async function sendReminder(booking, reminderType) {
  const is24Hour = reminderType === "24h";

  const trackingField = is24Hour
    ? "reminder24hSentAt"
    : "reminder1hSentAt";

  // Recheck the owner's current subscription before claiming.
  if (!(await isBusinessEligible(booking.businessId))) {
    return;
  }

  // Atomically claim the reminder to avoid duplicate sends.
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
    // Allow the scheduler to retry if sending fails.
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

    // Do not even query reminder bookings for ineligible owners.
    const eligibleBusinessIds = await getEligibleBusinessIds(now);

    if (eligibleBusinessIds.length === 0) {
      return;
    }

    const bookings = await Booking.find({
      businessId: { $in: eligibleBusinessIds },
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
      "_id businessId customerPhone bookingDate status reminder24hSentAt reminder1hSentAt"
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
  if (schedulerStarted) return;

  schedulerStarted = true;

  console.log("BookEasy: appointment reminder scheduler started");

  void checkAppointmentReminders();

  setInterval(() => {
    void checkAppointmentReminders();
  }, CHECK_INTERVAL_MS);
}

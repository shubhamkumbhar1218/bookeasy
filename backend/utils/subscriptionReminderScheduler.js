
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import PLANS from "../config/plans.js";
import { sendPushForNotification } from "./sendPushNotification.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let isRunning = false;
let schedulerStarted = false;

function getCurrentISTMonthRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;

  const start = new Date(`${year}-${month}-01T00:00:00+05:30`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end, monthKey: `${year}-${month}` };
}

async function createBusinessReminder({
  business,
  type,
  title,
  message,
  dedupeKey,
}) {
  const result = await Notification.updateOne(
    { dedupeKey },
    {
      $setOnInsert: {
        businessId: business._id,
        type,
        title,
        message,
        isRead: false,
        dedupeKey,
      },
    },
    { upsert: true }
  );

  // Send a push only when this reminder was newly created.
  if (result.upsertedCount !== 1) return;

  const notification = await Notification.findOne({ dedupeKey });

  if (!notification) return;

  try {
    await sendPushForNotification(notification);
  } catch (error) {
    console.error(
      "BookEasy reminder push failed:",
      type,
      error.message
    );
  }
}

async function checkBookingUsage(business, now) {
  const paidPlanExpired =
    ["STARTER", "BUSINESS", "PRO"].includes(business.plan) &&
    business.subscriptionEndDate &&
    new Date(business.subscriptionEndDate) <= now;

  const effectivePlan = paidPlanExpired ? "FREE" : business.plan;
  const plan = PLANS[effectivePlan];

  if (
    !plan ||
    plan.bookingLimit == null ||
    !Number.isFinite(Number(plan.bookingLimit)) ||
    Number(plan.bookingLimit) <= 0
  ) {
    return;
  }

  const { start, end, monthKey } = getCurrentISTMonthRange(now);

  const bookingsUsed = await Booking.countDocuments({
    businessId: business._id,
    createdAt: { $gte: start, $lt: end },
  });

  const limit = Number(plan.bookingLimit);

  if (bookingsUsed >= limit) {
    await createBusinessReminder({
      business,
      type: "booking_limit_reached",
      title: "Monthly booking limit reached",
      message: `You've used ${bookingsUsed} of ${limit} bookings this month. Upgrade your plan to accept more bookings.`,
      dedupeKey: `booking-limit:${business._id}:${monthKey}`,
    });

    return;
  }

  if (limit === 50 && bookingsUsed >= 41) {
    await createBusinessReminder({
      business,
      type: "booking_usage_41",
      title: "You're approaching your booking limit",
      message: `You've used ${bookingsUsed} of ${limit} bookings this month. Upgrade now to avoid interruptions.`,
      dedupeKey: `booking-usage-41:${business._id}:${monthKey}`,
    });
  }
}

async function checkSubscriptionExpiry(business, now) {
  if (
    !["STARTER", "BUSINESS", "PRO"].includes(business.plan) ||
    !business.subscriptionEndDate
  ) {
    return;
  }

  const endDate = new Date(business.subscriptionEndDate);
  const remaining = endDate.getTime() - now.getTime();

  if (!Number.isFinite(remaining)) return;

  const expiryKey = endDate.toISOString();

  if (remaining > 0 && remaining <= DAY_MS) {
    await createBusinessReminder({
      business,
      type: "subscription_expiry_1d",
      title: "Your subscription expires soon",
      message:
        "Your BookEasy subscription expires within 24 hours. Check your renewal and billing status.",
      dedupeKey: `subscription-expiry-1d:${business._id}:${expiryKey}`,
    });
  } else if (remaining > DAY_MS && remaining <= 3 * DAY_MS) {
    await createBusinessReminder({
      business,
      type: "subscription_expiry_3d",
      title: "Your subscription expires soon",
      message:
        "Your BookEasy subscription expires within 3 days. Check your renewal and billing status.",
      dedupeKey: `subscription-expiry-3d:${business._id}:${expiryKey}`,
    });
  } else if (remaining <= 0 && remaining >= -30 * DAY_MS) {
    await createBusinessReminder({
      business,
      type: "subscription_expired",
      title: "Your subscription has expired",
      message:
        "Your paid BookEasy plan has expired. Renew your subscription to restore paid-plan features.",
      dedupeKey: `subscription-expired:${business._id}:${expiryKey}`,
    });

    await User.updateOne(
      {
        _id: business._id,
        subscriptionEndDate: business.subscriptionEndDate,
        plan: business.plan,
      },
      { $set: { subscriptionStatus: "EXPIRED" } }
    );
  }
}

async function runSubscriptionReminderCheck() {
  if (isRunning) return;

  isRunning = true;

  try {
    const now = new Date();

    const businesses = await User.find({
      role: "BUSINESS",
      accountStatus: "ACTIVE",
      isActive: { $ne: false },
    }).select(
      "_id plan subscriptionEndDate subscriptionStatus"
    );

    for (const business of businesses) {
      try {
        await checkBookingUsage(business, now);
        await checkSubscriptionExpiry(business, now);
      } catch (error) {
        console.error(
          "BookEasy reminder check failed:",
          business._id,
          error.message
        );
      }
    }
  } catch (error) {
    console.error(
      "BookEasy subscription reminder scheduler error:",
      error.message
    );
  } finally {
    isRunning = false;
  }
}

export function startSubscriptionReminderScheduler() {
  if (schedulerStarted) return;

  schedulerStarted = true;

  console.log("BookEasy: subscription reminder scheduler started");

  void runSubscriptionReminderCheck();

  setInterval(() => {
    void runSubscriptionReminderCheck();
  }, CHECK_INTERVAL_MS);
}

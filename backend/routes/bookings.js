import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { normalizePhone } from "../utils/normalizePhone.js";
import PLANS from "../config/plans.js";
import { requireFeature } from "../middleware/requireFeature.js";
import {
  sendPushForNotification,
} from "../utils/sendPushNotification.js";

const router = express.Router();


/**
 * Check whether a proposed booking overlaps an existing
 * pending or confirmed booking for the same business.
 *
 * Each booking's end time is calculated using its service duration.
 */
function hasBookingConflict({
  bookings,
  startTime,
  endTime,
}) {
  const proposedStart = new Date(startTime).getTime();
  const proposedEnd = new Date(endTime).getTime();

  return bookings.some((booking) => {
    // Ignore bookings without a valid scheduled date.
    if (!booking.bookingDate) {
      return false;
    }

    // Only pending and confirmed bookings block a slot.
    if (!["pending", "confirmed"].includes(booking.status)) {
      return false;
    }

    const existingStart = new Date(
      booking.bookingDate
    ).getTime();

    const duration = Number(
      booking.serviceId?.duration
    );

    if (
      !Number.isFinite(existingStart) ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return false;
    }

    const existingEnd =
      existingStart + duration * 60 * 1000;

    // Overlap occurs when the appointments intersect.
    return (
      proposedStart < existingEnd &&
      proposedEnd > existingStart
    );
  });
}

// Get available booki
// ng slots
// ======================================================
// GET AVAILABLE BOOKING SLOTS
// ======================================================
router.get("/availability", async (req, res) => {
  try {
    const {
      businessId,
      serviceId,
      date,
      excludeBookingId,
    } = req.query;

    if (!businessId || !serviceId || !date) {
      return res.status(400).json({
        message:
          "businessId, serviceId and date are required",
      });
    }

    // Validate IDs before querying MongoDB.
    if (
      !mongoose.Types.ObjectId.isValid(businessId) ||
      !mongoose.Types.ObjectId.isValid(serviceId)
    ) {
      return res.status(400).json({
        message: "Invalid businessId or serviceId",
      });
    }

    if (
      excludeBookingId &&
      !mongoose.Types.ObjectId.isValid(excludeBookingId)
    ) {
      return res.status(400).json({
        message: "Invalid excludeBookingId",
      });
    }

    // Require a real calendar date in YYYY-MM-DD format.
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        message: "Invalid date. Expected YYYY-MM-DD",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    const business = await User.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    const service = await Service.findOne({
      _id: serviceId,
      businessId,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }


  let effectivePlan = business.plan || "FREE";

    // --------------------------------------------------
    // INDIA TIME HELPERS
    // --------------------------------------------------

    const IST_OFFSET_MS =
      5.5 * 60 * 60 * 1000;

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    // Get weekday from an India calendar date.
    // Using noon UTC avoids crossing the date boundary.
    const calendarDate = new Date(
      `${date}T12:00:00Z`
    );

    if (isNaN(calendarDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    const dayName =
      dayNames[calendarDate.getUTCDay()];

    const hours =
      business.workingHours?.[dayName];

    if (!hours || hours.closed) {
      return res.json({
        date,
        slots: [],
        message: "Business is closed",
      });
    }

    const [openHour, openMinute] =
      hours.open.split(":").map(Number);

    const [closeHour, closeMinute] =
      hours.close.split(":").map(Number);

    const openMinutes =
      openHour * 60 + openMinute;

    const closeMinutes =
      closeHour * 60 + closeMinute;

    // --------------------------------------------------
    // EXISTING ACTIVE BOOKINGS
    // --------------------------------------------------


    const bookingQuery = {
      businessId,
      status: {
        $in: ["pending", "confirmed"],
      },
    };

    if (excludeBookingId) {
      bookingQuery._id = {
        $ne: excludeBookingId,
      };
    }

    const existingBookings = await Booking.find(
      bookingQuery
    )
      .populate("serviceId", "duration")

    // --------------------------------------------------
    // CURRENT TIME IN INDIA
    // --------------------------------------------------

    const now = new Date();

    // --------------------------------------------------
    // GENERATE AVAILABLE SLOTS
    // --------------------------------------------------

    const slots = [];

    for (
      let minutes = openMinutes;
      minutes + service.duration <= closeMinutes;
      minutes += 30
    ) {
      const hour = Math.floor(
        minutes / 60
      );

      const minute = minutes % 60;

      const localWallClockAsUTC = Date.UTC(
        Number(date.split("-")[0]),
        Number(date.split("-")[1]) - 1,
        Number(date.split("-")[2]),
        hour,
        minute,
        0
      );

      const slotDate = new Date(
        localWallClockAsUTC - IST_OFFSET_MS
      );

      const slotEnd = new Date(
        slotDate.getTime() +
          service.duration * 60 * 1000
      );

      // --------------------------------------------------
      // DON'T SHOW PAST SLOTS
      // --------------------------------------------------

      if (slotDate <= now) {
        continue;
      }

      // --------------------------------------------------
      // CHECK BOOKING CONFLICT
      // --------------------------------------------------

const conflict = hasBookingConflict({
  bookings: existingBookings,
  startTime: slotDate,
  endTime: slotEnd,
});

      if (!conflict) {
        slots.push({
          value:
            slotDate.toISOString(),

          label:
            slotDate.toLocaleTimeString(
              "en-IN",
              {
                timeZone:
                  "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }
            ),
        });
      }
    }

    res.json({
      date,
      slots,
    });
  } catch (error) {
    console.log(
      "Availability error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

router.post("/public", async (req, res) => {
  try {
    const {
      businessId,
      serviceId,
      customerName,
      customerPhone,
      bookingDate,
    } = req.body;

    if (
      !businessId ||
      !serviceId ||
      !customerName ||
      !customerPhone ||
      !bookingDate
    ) {
      return res.status(400).json({
        message: "All booking fields are required",
      });
    }

    // --------------------------------------------------
    // FIND SERVICE
    // --------------------------------------------------

    const service = await Service.findOne({
      _id: serviceId,
      businessId,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }
// -----------------------------------------------
    // BUSINESS PLAN AND MONTHLY BOOKING LIMIT
    // -----------------------------------------------

    const business = await User.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    if (
      business.role !== "BUSINESS" ||
      business.accountStatus !== "ACTIVE" ||
      business.isActive === false
    ) {
      return res.status(403).json({
        message: "This business is not accepting bookings",
      });
    }

    let effectivePlan = business.plan || "FREE";

    const subscriptionExpired =
      business.subscriptionEndDate &&
      new Date(business.subscriptionEndDate) <= new Date();

if (
  effectivePlan !== "FREE" &&
  subscriptionExpired
) {
  effectivePlan = "FREE";
}

    const plan = PLANS[effectivePlan];

    if (!plan) {
      return res.status(500).json({
        message: "Invalid business subscription plan",
      });
    }

    // Free plan monthly booking limit
    if (plan.bookingLimit !== null) {
      // Get the current calendar month in India.
      const now = new Date();

      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
      }).formatToParts(now);

      const year = Number(
        parts.find((part) => part.type === "year").value
      );

      const month = Number(
        parts.find((part) => part.type === "month").value
      );

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

      const monthStart = new Date(
        Date.UTC(year, month - 1, 1) - IST_OFFSET_MS
      );

      const nextMonthStart = new Date(
        Date.UTC(year, month, 1) - IST_OFFSET_MS
      );

      // Count all bookings created this month,
      // including cancelled bookings.
      const bookingsUsed = await Booking.countDocuments({
        businessId,
        createdAt: {
          $gte: monthStart,
          $lt: nextMonthStart,
        },
      });

      if (bookingsUsed >= plan.bookingLimit) {
        return res.status(403).json({
          code: "BOOKING_LIMIT_REACHED",
          message:
            "Your Free plan monthly booking limit has been reached. Upgrade your plan to accept more bookings.",
          currentPlan: effectivePlan,
          bookingLimit: plan.bookingLimit,
          bookingsUsed,
          resetsAt: nextMonthStart,
        });
      }
    }


    // --------------------------------------------------
    // BOOKING DATE
    // --------------------------------------------------

    const startTime = new Date(bookingDate);

    if (isNaN(startTime.getTime())) {
      return res.status(400).json({
        message: "Invalid booking date",
      });
    }

    // --------------------------------------------------
    // BOOKING END TIME
    // --------------------------------------------------

    const endTime = new Date(
      startTime.getTime() +
        service.duration * 60 * 1000
    );

    // --------------------------------------------------
    // EXACT SLOT KEY
    // --------------------------------------------------

        const bookingSlot = `${businessId}_${startTime.toISOString()}`;

    // Check overlapping active bookings for this business.
    const bookingQuery = {
      businessId,
      status: { $in: ["pending", "confirmed"] },
    };

    const existingBookings = await Booking.find(bookingQuery)
      .populate("serviceId", "duration")

    const hasConflict = hasBookingConflict({
      bookings: existingBookings,
      startTime,
      endTime,
    });

    if (hasConflict) {
      return res.status(409).json({
        message:
          "This time overlaps an existing appointment. Please select another time.",
      });
    }
// --------------------------------------------------
    // CREATE BOOKING
    // --------------------------------------------------

    const booking =
      await Booking.create({
        businessId,
        serviceId,
        customerName:
          customerName.trim(),
        customerPhone: normalizePhone(customerPhone),
        bookingDate: startTime,
        bookingSlot,
      });

    // --------------------------------------------------
    // BUSINESS OWNER NOTIFICATION
    // --------------------------------------------------

// --------------------------------------------------
// BUSINESS OWNER NOTIFICATION
// --------------------------------------------------
// --------------------------------------------------
// BUSINESS OWNER NOTIFICATION
// --------------------------------------------------

const businessNotification =
  await Notification.create({
    businessId:
      booking.businessId,
    type: "new_booking",
    title: "New appointment",
    message:
      `${customerName.trim()} booked an appointment.`,
    bookingId: booking._id,
  });

console.log(
  "BOOKEASY: ABOUT TO SEND BUSINESS PUSH"
);

await sendPushForNotification(
  businessNotification
);

// --------------------------------------------------
// CUSTOMER NOTIFICATION
// --------------------------------------------------

const customerNotification =
  await Notification.create({
    customerPhone:
      normalizePhone(customerPhone),
    type: "new_booking",
    title: "Booking received",
    message:
      "Your appointment has been booked successfully.",
    bookingId: booking._id,
  });

console.log(
  "BOOKEASY: ABOUT TO SEND CUSTOMER PUSH"
);

await sendPushForNotification(
  customerNotification
);

// --------------------------------------------------
// RESPONSE
// --------------------------------------------------
return res.status(201).json({
  message: "Booking created successfully",
  booking,
});
  } catch (error) {
    console.log("Public booking error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// Get bookings for a business
router.get("/business/:businessId", authMiddleware,async (req, res) => {
  try {
    if (req.user.id !== req.params.businessId) {
  return res.status(403).json({
    message: "You are not allowed to view these bookings",
  });
}
const bookings = await Booking.find({
  businessId: req.params.businessId,
})
  .populate("serviceId", "name price duration")
  .sort({ bookingDate: 1 });

    res.json(bookings);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


router.get("/customer", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const bookings = await Booking.find({
      customerPhone: cleanPhone,
    })
      .populate("serviceId", "name price duration")
      .sort({ bookingDate: -1 });

    res.json(bookings);
  } catch (error) {
    console.log("Customer bookings error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});



/**
 * ADVANCED ANALYTICS
 * BUSINESS and PRO plans only.
 * Separate from the existing Business Analytics endpoint.
 */
router.get(
  "/advanced-analytics",
  authMiddleware,
  requireFeature("advanced_analytics"),
  async (req, res) => {
    try {
      const businessId = req.user.id;

      // Use the last six calendar months, based on India time.
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      }).formatToParts(now);

      const dateValues = Object.fromEntries(
        dateParts.map(({ type, value }) => [type, value])
      );

      const currentYear = Number(dateValues.year);
      const currentMonth = Number(dateValues.month);

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

      const firstMonth = new Date(
        Date.UTC(currentYear, currentMonth - 6, 1) -
          IST_OFFSET_MS
      );

      const bookings = await Booking.find({
        businessId,
        bookingDate: {
          $gte: firstMonth,
          $lte: now,
        },
      })
        .populate("serviceId", "name price")
        .sort({ bookingDate: 1 })
        .lean();

      const statuses = {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };

      const monthlyMap = new Map();
      const serviceMap = new Map();
      const customerMap = new Map();

      let estimatedCompletedRevenue = 0;

      // Prepare all six calendar-month buckets, including empty months.
      for (let offset = 5; offset >= 0; offset--) {
        const monthDate = new Date(
          Date.UTC(currentYear, currentMonth - 1 - offset, 1)
        );

        const key = [
          monthDate.getUTCFullYear(),
          String(monthDate.getUTCMonth() + 1).padStart(2, "0"),
        ].join("-");

        monthlyMap.set(key, {
          month: key,
          bookings: 0,
          completed: 0,
          cancelled: 0,
        });
      }

      const monthFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      });

      for (const booking of bookings) {
        const status = booking.status;

        if (Object.hasOwn(statuses, status)) {
          statuses[status]++;
        }

        const monthKey = monthFormatter.format(
          new Date(booking.bookingDate)
        );

        const monthly = monthlyMap.get(monthKey);

        if (monthly) {
          monthly.bookings++;

          if (status === "completed") {
            monthly.completed++;
          }

          if (status === "cancelled") {
            monthly.cancelled++;
          }
        }

        const serviceId = booking.serviceId?._id?.toString();

        if (serviceId) {
          const existing = serviceMap.get(serviceId) || {
            serviceId,
            name: booking.serviceId.name || "Unnamed service",
            bookings: 0,
            completed: 0,
          };

          existing.bookings++;

          if (status === "completed") {
            existing.completed++;

            // Estimate only: uses today's service price, not a
            // stored historical price or verified payment.
            estimatedCompletedRevenue += Number(
              booking.serviceId.price || 0
            );
          }

          serviceMap.set(serviceId, existing);
        }

        const phone = String(booking.customerPhone || "").trim();

        if (phone) {
          const customer = customerMap.get(phone) || {
            bookings: 0,
            completed: 0,
          };

          customer.bookings++;

          if (status === "completed") {
            customer.completed++;
          }

          customerMap.set(phone, customer);
        }
      }

      const totalBookings = bookings.length;
      const completed = statuses.completed;
      const cancelled = statuses.cancelled;
      const noShow = statuses.no_show;

      // Completion rate uses all bookings in this reporting window.
      const completionRate = totalBookings
        ? Number(((completed / totalBookings) * 100).toFixed(1))
        : 0;

      // No-show rate uses completed + no-show bookings.
      const attendanceBase = completed + noShow;
      const noShowRate = attendanceBase
        ? Number(((noShow / attendanceBase) * 100).toFixed(1))
        : 0;

      const customers = Array.from(customerMap.values());
      const uniqueCustomers = customers.length;
      const repeatCustomers = customers.filter(
        (customer) => customer.bookings > 1
      ).length;

      const repeatCustomerRate = uniqueCustomers
        ? Number(((repeatCustomers / uniqueCustomers) * 100).toFixed(1))
        : 0;

      const popularServices = Array.from(serviceMap.values())
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);

      return res.json({
        success: true,
        period: {
          start: firstMonth.toISOString(),
          end: now.toISOString(),
          months: 6,
        },
        overview: {
          totalBookings,
          completedBookings: completed,
          cancelledBookings: cancelled,
          pendingBookings: statuses.pending,
          confirmedBookings: statuses.confirmed,
          noShowBookings: noShow,
          uniqueCustomers,
          repeatCustomers,
          completionRate,
          noShowRate,
          repeatCustomerRate,
          estimatedCompletedRevenue: Math.round(
            estimatedCompletedRevenue
          ),
        },
        monthlyTrends: Array.from(monthlyMap.values()),
        popularServices,
        revenueNote:
          "Estimated from current service prices for completed bookings; this is not verified payment revenue.",
      });
    } catch (error) {
      console.error("Advanced analytics error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load advanced analytics.",
      });
    }
  }
);



router.get(
  "/stats/:businessId",
  authMiddleware,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const { year, month } = req.query;

      // --------------------------------------------------
      // CHECK BUSINESS OWNER
      // --------------------------------------------------

      if (businessId !== req.user.id.toString()) {
        return res.status(403).json({
          message:
            "You are not allowed to view these statistics",
        });
      }

      // --------------------------------------------------
      // GET CURRENT INDIA DATE
      // --------------------------------------------------

      const now = new Date();

      const indiaDateFormatter =
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
        });

      const todayIST =
        indiaDateFormatter.format(now);

      const currentYear =
        Number(todayIST.substring(0, 4));

      const currentMonth =
        Number(todayIST.substring(5, 7));

      // --------------------------------------------------
      // VALIDATE YEAR
      // --------------------------------------------------

      let selectedYear = year
        ? Number(year)
        : currentYear;

      if (
        !Number.isInteger(selectedYear) ||
        selectedYear < 2000 ||
        selectedYear > 2100
      ) {
        return res.status(400).json({
          message: "Invalid year",
        });
      }

      // --------------------------------------------------
      // VALIDATE MONTH
      // --------------------------------------------------

      let selectedMonth = null;

      if (
        month !== undefined &&
        month !== null &&
        month !== ""
      ) {
        selectedMonth = Number(month);

        if (
          !Number.isInteger(selectedMonth) ||
          selectedMonth < 1 ||
          selectedMonth > 12
        ) {
          return res.status(400).json({
            message: "Invalid month",
          });
        }
      }

      const IST_OFFSET_MS =
        5.5 * 60 * 60 * 1000;

      let rangeStart;
      let rangeEnd;

      if (selectedMonth) {
        const startUTC = Date.UTC(
          selectedYear,
          selectedMonth - 1,
          1,
          0,
          0,
          0
        );

        const endUTC = Date.UTC(
          selectedYear,
          selectedMonth,
          1,
          0,
          0,
          0
        );

        rangeStart = new Date(
          startUTC - IST_OFFSET_MS
        );

        rangeEnd = new Date(
          endUTC - IST_OFFSET_MS
        );
      } else {
        // Whole selected year

        const startUTC = Date.UTC(
          selectedYear,
          0,
          1,
          0,
          0,
          0
        );

        const endUTC = Date.UTC(
          selectedYear + 1,
          0,
          1,
          0,
          0,
          0
        );

        rangeStart = new Date(
          startUTC - IST_OFFSET_MS
        );

        rangeEnd = new Date(
          endUTC - IST_OFFSET_MS
        );
      }

      // --------------------------------------------------
      // GET BOOKINGS FOR SELECTED PERIOD
      // --------------------------------------------------

      const periodBookings =
        await Booking.find({
          businessId,
          bookingDate: {
            $gte: rangeStart,
            $lt: rangeEnd,
          },
        }).populate(
          "serviceId",
          "name price duration"
        );

      // --------------------------------------------------
      // ALL BOOKINGS
      //
      // Used for lifetime totals.
      // --------------------------------------------------

      const allBookings =
        await Booking.find({
          businessId,
        }).populate(
          "serviceId",
          "name price duration"
        );

      // --------------------------------------------------
      // PERIOD BOOKING COUNTS
      // --------------------------------------------------

      const totalBookings =
        periodBookings.length;

      const pendingBookings =
        periodBookings.filter(
          (booking) =>
            booking.status === "pending"
        ).length;

      const confirmedBookings =
        periodBookings.filter(
          (booking) =>
            booking.status === "confirmed"
        ).length;

      const cancelledBookings =
        periodBookings.filter(
          (booking) =>
            booking.status === "cancelled"
        ).length;

      const completedBookings =
        periodBookings.filter(
          (booking) =>
            booking.status === "completed"
        ).length;

      
      const noShowBookings =
        periodBookings.filter(
          (booking) => booking.status === "no_show"
        ).length;

      const eligibleNoShowBookings =
        periodBookings.filter(
          (booking) =>
            ["completed", "no_show"].includes(booking.status)
        ).length;

      const noShowRate =
        eligibleNoShowBookings > 0
          ? Number(
              (
                (noShowBookings / eligibleNoShowBookings) *
                100
              ).toFixed(1)
            )
          : 0;


      const periodRevenue =
        periodBookings
          .filter(
            (booking) =>
              booking.status === "completed"
          )
          .reduce(
            (total, booking) =>
              total +
              Number(
                booking.serviceId?.price || 0
              ),
            0
          );

      // --------------------------------------------------
      // LIFETIME REVENUE
      // --------------------------------------------------

      const totalRevenue =
        allBookings
          .filter(
            (booking) =>
              booking.status === "completed"
          )
          .reduce(
            (total, booking) =>
              total +
              Number(
                booking.serviceId?.price || 0
              ),
            0
          );

      // --------------------------------------------------
      // TODAY'S BOOKINGS
      // --------------------------------------------------

      const todayBookings =
        allBookings.filter((booking) => {
          if (!booking.bookingDate) {
            return false;
          }

          const bookingDateIST =
            indiaDateFormatter.format(
              new Date(booking.bookingDate)
            );

          return bookingDateIST === todayIST;
        });

      const todayBookingCount =
        todayBookings.length;

      // --------------------------------------------------
      // TODAY'S REVENUE
      // --------------------------------------------------

      const todayRevenue =
        todayBookings
          .filter(
            (booking) =>
              booking.status === "completed"
          )
          .reduce(
            (total, booking) =>
              total +
              Number(
                booking.serviceId?.price || 0
              ),
            0
          );

      // --------------------------------------------------
      // CURRENT MONTH BOOKINGS
      // --------------------------------------------------

      const currentMonthIST =
        todayIST.substring(0, 7);

      const monthlyBookings =
        allBookings.filter((booking) => {
          if (!booking.bookingDate) {
            return false;
          }

          const bookingDateIST =
            indiaDateFormatter.format(
              new Date(booking.bookingDate)
            );

          return (
            bookingDateIST.substring(0, 7) ===
            currentMonthIST
          );
        });

      const monthlyBookingCount =
        monthlyBookings.length;

      // --------------------------------------------------
      // CURRENT MONTH REVENUE
      // --------------------------------------------------

      const monthlyRevenue =
        monthlyBookings
          .filter(
            (booking) =>
              booking.status === "completed"
          )
          .reduce(
            (total, booking) =>
              total +
              Number(
                booking.serviceId?.price || 0
              ),
            0
          );

      // --------------------------------------------------
      // DETERMINE CURRENT / PAST PERIOD
      // --------------------------------------------------

      const isCurrentYear =
        selectedYear === currentYear;

      const isCurrentMonth =
        selectedMonth === currentMonth &&
        isCurrentYear;

      const isCurrentPeriod =
        selectedMonth
          ? isCurrentMonth
          : isCurrentYear;

      // --------------------------------------------------
      // PERIOD LABEL
      // --------------------------------------------------

      let periodLabel;

      if (selectedMonth) {
        const monthName =
          new Date(
            selectedYear,
            selectedMonth - 1,
            1
          ).toLocaleString(
            "en-IN",
            {
              month: "long",
            }
          );

        periodLabel =
          `${monthName} ${selectedYear}`;
      } else {
        periodLabel =
          `${selectedYear}`;
      }

      // --------------------------------------------------
      // RESPONSE
      // --------------------------------------------------

      res.json({
        period: {
          year: selectedYear,
          month: selectedMonth,
          label: periodLabel,
          isCurrent: isCurrentPeriod,
        },

        // Selected period
        periodBookings: totalBookings,
        periodRevenue,

        // Status
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        
        noShowBookings,
        noShowRate,


        // Today
        todayBookings: todayBookingCount,
        todayRevenue,

        // Current month
        monthlyBookings:
          monthlyBookingCount,
        monthlyRevenue,

        // Lifetime
        totalBookings:
          allBookings.length,
        totalRevenue,

        // Backward compatibility
        revenue: totalRevenue,
        todayEarnings: todayRevenue,
        todayBookingCount,
        monthlyBookingCount,
      });
    } catch (error) {
      console.log(
        "Business statistics error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// RESCHEDULE BOOKING - BUSINESS OWNER
// ======================================================
router.patch("/:id/reschedule", authMiddleware, async (req, res) => {
  try {
    const { bookingDate } = req.body;

    if (!bookingDate) {
      return res.status(400).json({
        message: "New booking date is required",
      });
    }

    // --------------------------------------------------
    // PARSE NEW BOOKING DATE
    // --------------------------------------------------

    const newStartTime = new Date(bookingDate);

    if (isNaN(newStartTime.getTime())) {
      return res.status(400).json({
        message: "Invalid booking date",
      });
    }

    // --------------------------------------------------
    // FIND BOOKING
    // --------------------------------------------------

    const booking = await Booking.findById(req.params.id)
      .populate("serviceId", "name price duration");

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // --------------------------------------------------
    // CHECK BUSINESS OWNER
    // --------------------------------------------------

    if (
      booking.businessId.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to modify this booking",
      });
    }

    // --------------------------------------------------
    // CHECK BOOKING STATUS
    // --------------------------------------------------

    if (
      booking.status !== "pending" &&
      booking.status !== "confirmed"
    ) {
      return res.status(400).json({
        message:
          "Only pending or confirmed bookings can be rescheduled",
      });
    }

    // --------------------------------------------------
    // FIND BUSINESS
    // --------------------------------------------------

    const business = await User.findById(
      booking.businessId
    );

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    // --------------------------------------------------
    // CONVERT NEW DATE TO INDIA TIME
    // --------------------------------------------------

    const IST_OFFSET_MS =
      5.5 * 60 * 60 * 1000;

    const istDate = new Date(
      newStartTime.getTime() + IST_OFFSET_MS
    );

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const dayName =
      dayNames[istDate.getUTCDay()];

    const hours =
      business.workingHours?.[dayName];

    if (!hours || hours.closed) {
      return res.status(400).json({
        message:
          "Business is closed on this day",
      });
    }

    // --------------------------------------------------
    // GET INDIA LOCAL TIME
    // --------------------------------------------------

    const indiaHour =
      istDate.getUTCHours();

    const indiaMinute =
      istDate.getUTCMinutes();

    const startMinutes =
      indiaHour * 60 + indiaMinute;

    const [
      openHour,
      openMinute,
    ] = hours.open
      .split(":")
      .map(Number);

    const [
      closeHour,
      closeMinute,
    ] = hours.close
      .split(":")
      .map(Number);

    const openMinutes =
      openHour * 60 + openMinute;

    const closeMinutes =
      closeHour * 60 + closeMinute;

    // --------------------------------------------------
    // CHECK WORKING HOURS
    // --------------------------------------------------

    const endMinutes =
      startMinutes +
      booking.serviceId.duration;

    if (
      startMinutes < openMinutes ||
      endMinutes > closeMinutes
    ) {
      return res.status(400).json({
        message:
          `Booking must be between ${hours.open} and ${hours.close}`,
      });
    }

    // --------------------------------------------------
    // DON'T ALLOW PAST TIME
    // --------------------------------------------------

    if (newStartTime <= new Date()) {
      return res.status(400).json({
        message:
          "You cannot reschedule an appointment to a past time",
      });
    }

    // --------------------------------------------------
    // CALCULATE END TIME
    // --------------------------------------------------

    const newEndTime = new Date(
      newStartTime.getTime() +
        booking.serviceId.duration *
          60 *
          1000
    );

    // --------------------------------------------------
    // FIND OTHER ACTIVE BOOKINGS
    // --------------------------------------------------

    const existingBookings =
      await Booking.find({
        businessId: booking.businessId,
        _id: {
          $ne: booking._id,
        },
        status: {
          $in: ["pending", "confirmed"],
        },
      }).populate(
        "serviceId",
        "duration"
      );

    // --------------------------------------------------
    // CHECK TIME OVERLAP
    // --------------------------------------------------

const hasConflict = hasBookingConflict({
      bookings: existingBookings,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    if (hasConflict) {
      return res.status(409).json({
        message:
          "This time slot is already booked. Please select another time.",
      });
    }

    // --------------------------------------------------
    // CREATE UNIQUE SLOT KEY
    // --------------------------------------------------

    const bookingSlot =
      `${booking.businessId}_${newStartTime.toISOString()}`;

    // --------------------------------------------------
    // SAVE OLD DATE
    // --------------------------------------------------

    const oldBookingDate =
      booking.bookingDate;

    // --------------------------------------------------
    // UPDATE BOOKING
    // --------------------------------------------------


if (!Array.isArray(booking.statusHistory)) {
  booking.statusHistory = [];
}

const previousBookingDate = booking.bookingDate;

booking.bookingDate = newStartTime;
booking.bookingSlot = bookingSlot;

booking.statusHistory.push({
  action: "rescheduled",
  status: booking.status,
  oldBookingDate: previousBookingDate,
  newBookingDate: newStartTime,
  changedBy: req.user.id,
  changedByName: req.user.name || "Business owner",
  changedAt: new Date(),
});

    // Reset reminders for the new appointment time
    booking.reminder24hSentAt = null;
    booking.reminder1hSentAt = null;

    try {
      await booking.save();

    } catch (saveError) {
      // MongoDB duplicate key
      if (saveError.code === 11000) {
        return res.status(409).json({
          message:
            "This time slot was just booked by another customer. Please select another time.",
        });
      }

      throw saveError;
    }

    // --------------------------------------------------
    // FORMAT INDIA TIME FOR CUSTOMER
    // --------------------------------------------------

    const formattedDate =
      newStartTime.toLocaleString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }
      );

    // --------------------------------------------------
    // CUSTOMER NOTIFICATION
    // --------------------------------------------------


const rescheduledNotification = await Notification.create({
  customerPhone: normalizePhone(booking.customerPhone),
  type: "booking_rescheduled",
  title: "Booking rescheduled",
  message: `Your appointment has been rescheduled to ${formattedDate}.`,
  bookingId: booking._id,
});

console.log(
  "BOOKEASY: Sending customer reschedule push:",
  booking._id.toString()
);

await sendPushForNotification(rescheduledNotification);


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.json({
      message:
        "Booking rescheduled successfully",
      booking,
      oldBookingDate,
      newBookingDate: newStartTime,
    });
  } catch (error) {
    console.log(
      "Business reschedule error:",
      error
    );

    // MongoDB duplicate-key protection
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This time slot was just booked by another customer. Please select another time.",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
});
// Confirm booking
router.patch("/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

if (
  booking.businessId.toString() !==
  req.user.id.toString()
) {
  return res.status(403).json({
    message:
      "You are not allowed to modify this booking",
  });
}

    booking.status = "confirmed";

    await booking.save();

const confirmedNotification =
  await Notification.create({
    customerPhone: normalizePhone(booking.customerPhone),
    type: "booking_confirmed",
    title: "Booking confirmed",
    message:
      "Your booking has been confirmed.",
    bookingId: booking._id,
  });

await sendPushForNotification(
  confirmedNotification
);

    res.json({
      message: "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Cancel booking
router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.businessId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to modify this booking",
      });
    }

if (booking.status === "cancelled") {
  return res.status(400).json({
    message: "This booking is already cancelled",
  });
}

if (!Array.isArray(booking.statusHistory)) {
  booking.statusHistory = [];
}

booking.status = "cancelled";

booking.statusHistory.push({
  status: "cancelled",
  changedBy: req.user.id,
  changedByName: req.user.name || "Business owner",
  changedAt: new Date(),
});

await booking.save();

const cancelledNotification =
  await Notification.create({
    customerPhone: normalizePhone(booking.customerPhone),
    type: "booking_cancelled",
    title: "Booking cancelled",
    message:
      "Your booking has been cancelled by the business.",
    bookingId: booking._id,
  });


console.log("BOOKEASY: CANCELLATION NOTIFICATION CREATED", {
  bookingId: booking._id.toString(),
  customerPhone: normalizePhone(booking.customerPhone),
  notificationId: cancelledNotification._id.toString(),
  type: cancelledNotification.type,
});

await sendPushForNotification(cancelledNotification);


    res.json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Complete booking
router.patch("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

if (booking.businessId.toString() !== req.user.id.toString()) {
  return res.status(403).json({
    message: "You are not allowed to modify this booking",
  });
}

    if (booking.businessId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to modify this booking",
      });
    }


if (!["pending", "confirmed"].includes(booking.status)) {
  return res.status(400).json({
    message: "Only pending or confirmed bookings can be completed",
  });
}

if (new Date(booking.bookingDate) > new Date()) {
  return res.status(400).json({
    message: "A future appointment cannot be completed",
  });
}

if (!Array.isArray(booking.statusHistory)) {
  booking.statusHistory = [];
}

booking.status = "completed";

booking.statusHistory.push({
  status: "completed",
  changedBy: req.user.id,
  changedByName: req.user.name || "Business owner",
  changedAt: new Date(),
});

await booking.save();

if (!Array.isArray(booking.statusHistory)) {
  booking.statusHistory = [];
}

booking.statusHistory.push({
  status: "completed",
  changedBy: req.user.id,
  changedByName: req.user.name || "Business owner",
  changedAt: new Date(),
});

await booking.save();

const completedNotification =
  await Notification.create({
   customerPhone: normalizePhone(booking.customerPhone),
    type: "booking_completed",
    title: "Booking completed",
    message:
      "Your booking has been completed. Thank you for choosing us!",
    bookingId: booking._id,
  });

await sendPushForNotification(
  completedNotification
);

    res.json({
      message: "Booking completed successfully",
      booking,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});



/**
 * Mark an appointment as a no-show.
 * Only active, eligible paid subscribers can use this feature.
 */
router.patch(
  "/:id/no-show",
  authMiddleware,
  requireFeature("automated_reminders"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      if (
        booking.status !== "pending" &&
        booking.status !== "confirmed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only pending or confirmed appointments can be marked as no-show.",
        });
      }

      if (new Date(booking.bookingDate) > new Date()) {
        return res.status(400).json({
          success: false,
          message:
            "An appointment cannot be marked as no-show before its scheduled time.",
        });
      }

      booking.status = "no_show";
      await booking.save();

      return res.json({
        success: true,
        message: "Appointment marked as no-show.",
        booking,
      });
    } catch (error) {
      console.error("Mark no-show error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to mark appointment as no-show.",
      });
    }
  }
);



export default router;
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
import { getBookingQuotaCycle } from "../utils/bookingQuota.js";
import { awardLoyaltyVisit } from "../utils/loyaltyService.js";
import Staff from "../models/Staff.js";
import BookingSlotLock from "../models/BookingSlotLock.js";

import {
  getEligibleStaffForSlot,
} from "../utils/staffAssignment.js";

import {
  reserveStaffBookingLocks,
  releaseBookingLocks,
} from "../utils/bookingSlotLocks.js";

const router = express.Router();

// --------------------------------------------------
// CHECK WHETHER TEAM MANAGEMENT IS CURRENTLY ACTIVE
// --------------------------------------------------
const isTeamManagementEnabled = (business) => {
  const planName = String(business?.plan || "FREE").toUpperCase();
  const plan = PLANS[planName];

  if (!plan?.features?.includes("staff_management")) {
    return false;
  }

  if (business.subscriptionStatus !== "ACTIVE") {
    return false;
  }

  const expiry = business.subscriptionEndDate;

  if (
    !(expiry instanceof Date) ||
    Number.isNaN(expiry.getTime()) ||
    expiry.getTime() <= Date.now()
  ) {
    return false;
  }

  return true;
};

// Check whether this business belongs to a healthcare category.
const isHealthcareBusiness = (business) => {
  const healthcareTypes = new Set([
    "hospital",
    "dental clinic",
    "doctor / clinic",
    "physiotherapy",
    "diagnostic lab",
    "pet clinic / veterinary",
  ]);

  return healthcareTypes.has(
    String(business?.businessType || "").trim().toLowerCase()
  );
};

// --------------------------------------------------
// RELEASE LOCKS WHEN A BOOKING BECOMES INACTIVE
// --------------------------------------------------
const updateBookingAndReleaseLocks = async ({
  bookingId,
  businessId,
  update,
}) => {
  const session = await mongoose.startSession();

  try {
    let updatedBooking;

    await session.withTransaction(async () => {
      updatedBooking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          businessId,
          status: { $in: ["pending", "confirmed"] },
        },
        update,
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!updatedBooking) {
        throw new Error("BOOKING_NOT_ACTIVE");
      }

      await releaseBookingLocks({
        bookingId,
        session,
      });
    });

    return updatedBooking;
  } finally {
    await session.endSession();
  }
};

/**
 * Check appointment overlap, including each service's
 * buffer time after the appointment.
 *
 * Older services default to a 30-minute interval and
 * zero buffer.
 */
function hasBookingConflict({
  bookings,
  startTime,
  endTime,
  bufferMinutes = 0,
}) {
  const proposedStart = new Date(startTime).getTime();
  const proposedEnd = new Date(endTime).getTime();

  if (
    !Number.isFinite(proposedStart) ||
    !Number.isFinite(proposedEnd) ||
    proposedEnd <= proposedStart
  ) {
    return true;
  }

  const proposedBlockedEnd =
    proposedEnd + Number(bufferMinutes || 0) * 60 * 1000;

  return bookings.some((booking) => {
    if (
      !booking.bookingDate ||
      !["pending", "confirmed"].includes(booking.status)
    ) {
      return false;
    }

    const existingStart =
      new Date(booking.bookingDate).getTime();

    const duration = Number(booking.serviceId?.duration);

    const existingBuffer = Number(
      booking.serviceId?.bufferMinutes ?? 0
    );

    if (
      !Number.isFinite(existingStart) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(existingBuffer) ||
      existingBuffer < 0
    ) {
      // Fail safely if an active booking has invalid timing data.
      return true;
    }

    const existingBlockedEnd =
      existingStart +
      (duration + existingBuffer) * 60 * 1000;

    // Include buffers on both appointments.
    return (
      proposedStart < existingBlockedEnd &&
      proposedBlockedEnd > existingStart
    );
  });
}

const sendNewBookingNotifications = async (
  booking,
  customerName,
  customerPhone
) => {
  const businessNotification = await Notification.create({
    businessId: booking.businessId,
    type: "new_booking",
    title: "New appointment",
    message: `${customerName} booked an appointment.`,
    bookingId: booking._id,
  });

  await sendPushForNotification(businessNotification);

  const customerNotification = await Notification.create({
    customerPhone,
    type: "new_booking",
    title: "Booking received",
    message: "Your appointment has been booked successfully.",
    bookingId: booking._id,
  });

  await sendPushForNotification(customerNotification);
};

// Get available booki
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
        message: "businessId, serviceId and date are required",
      });
    }

    if (
      !mongoose.isValidObjectId(businessId) ||
      !mongoose.isValidObjectId(serviceId)
    ) {
      return res.status(400).json({
        message: "Invalid businessId or serviceId",
      });
    }

    if (
      excludeBookingId &&
      !mongoose.isValidObjectId(excludeBookingId)
    ) {
      return res.status(400).json({
        message: "Invalid excludeBookingId",
      });
    }

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

    if (!business || business.role !== "BUSINESS") {
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

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const calendarDate = new Date(`${date}T12:00:00Z`);
    const dayName = dayNames[calendarDate.getUTCDay()];
    const hours = business.workingHours?.[dayName];

    if (!hours || hours.closed) {
      return res.json({
        date,
        slots: [],
        message: "Business is closed",
      });
    }

    if (
      typeof hours.open !== "string" ||
      typeof hours.close !== "string" ||
      !/^\d{2}:\d{2}$/.test(hours.open) ||
      !/^\d{2}:\d{2}$/.test(hours.close)
    ) {
      return res.status(400).json({
        message: "Business working hours are invalid",
      });
    }

    const [openHour, openMinute] = hours.open.split(":").map(Number);
    const [closeHour, closeMinute] = hours.close.split(":").map(Number);

    if (
      openHour > 23 || closeHour > 23 ||
      openMinute > 59 || closeMinute > 59
    ) {
      return res.status(400).json({
        message: "Business working hours are invalid",
      });
    }

    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    const slotIntervalMinutes = Number(
      service.slotIntervalMinutes ?? 30
    );

    const durationMinutes = Number(service.duration);
    const bufferMinutes = Number(service.bufferMinutes ?? 0);

    if (
      ![5, 10, 15, 20, 30].includes(slotIntervalMinutes) ||
      ![15, 20, 30, 45, 60].includes(durationMinutes) ||
      ![0, 5, 10, 15].includes(bufferMinutes)
    ) {
      return res.status(400).json({
        message: "Invalid service scheduling settings",
      });
    }

    const teamEnabled = isTeamManagementEnabled(business);

    if (isHealthcareBusiness(business) && !teamEnabled) {
  return res.json({
    date,
    slots: [],
    message:
      "Healthcare bookings require an active Team Management subscription and eligible staff.",
  });
}

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const slots = [];

    // Generate each possible service slot.
    for (
      let minutes = openMinutes;
      minutes + durationMinutes + bufferMinutes <= closeMinutes;
      minutes += slotIntervalMinutes
    ) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;

      const slotDate = new Date(
        Date.UTC(
          Number(date.slice(0, 4)),
          Number(date.slice(5, 7)) - 1,
          Number(date.slice(8, 10)),
          hour,
          minute
        ) - IST_OFFSET_MS
      );

      if (slotDate <= now) {
        continue;
      }

      const slotEnd = new Date(
        slotDate.getTime() + durationMinutes * 60000
      );

      let available = false;

      if (teamEnabled) {
        const eligibleStaff = await getEligibleStaffForSlot({
          business,
          service,
          startTime: slotDate,
          endTime: slotEnd,
          excludeBookingId: excludeBookingId || null,
        });

        available = eligibleStaff.length > 0;
      } else {
        // Preserve legacy business-wide scheduling for plans
        // without active team management.
        const bookingQuery = {
          businessId,
          status: { $in: ["pending", "confirmed"] },
        };

        if (excludeBookingId) {
          bookingQuery._id = { $ne: excludeBookingId };
        }

        const existingBookings = await Booking.find(bookingQuery)
          .populate("serviceId", "duration bufferMinutes");

        available = !hasBookingConflict({
          bookings: existingBookings,
          startTime: slotDate,
          endTime: slotEnd,
          bufferMinutes,
        });
      }

      if (available) {
        slots.push({
          value: slotDate.toISOString(),
          label: slotDate.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        });
      }
    }

    return res.json({
      date,
      slots,
    });
  } catch (error) {
    console.error("Availability error:", error);

    return res.status(500).json({
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

    if (
      !mongoose.isValidObjectId(businessId) ||
      !mongoose.isValidObjectId(serviceId)
    ) {
      return res.status(400).json({
        message: "Invalid business or service",
      });
    }

    const cleanName = String(customerName).trim();
    const cleanPhone = normalizePhone(customerPhone);

    if (!cleanName || !cleanPhone) {
      return res.status(400).json({
        message: "Valid customer name and phone are required",
      });
    }

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

    // --------------------------------------------------
    // PLAN AND BOOKING QUOTA
    // --------------------------------------------------

    let effectivePlan = business.plan || "FREE";

    const subscriptionExpired =
      business.subscriptionEndDate &&
      new Date(business.subscriptionEndDate) <= new Date();

    if (
      effectivePlan !== "FREE" &&
      (
        subscriptionExpired ||
        business.subscriptionStatus !== "ACTIVE"
      )
    ) {
      effectivePlan = "FREE";
    }

    const plan = PLANS[effectivePlan];

    if (!plan) {
      return res.status(500).json({
        message: "Invalid business subscription plan",
      });
    }

    if (plan.bookingLimit !== null) {
      const { start, end } = getBookingQuotaCycle(
        business.createdAt,
        new Date()
      );

      const bookingsUsed = await Booking.countDocuments({
        businessId,
        createdAt: { $gte: start, $lt: end },
      });

      if (bookingsUsed >= plan.bookingLimit) {
        return res.status(403).json({
          code: "BOOKING_LIMIT_REACHED",
          message:
            "Your Free plan booking limit has been reached for this monthly cycle. Upgrade your plan to accept more bookings.",
          currentPlan: effectivePlan,
          bookingLimit: plan.bookingLimit,
          bookingsUsed,
          resetsAt: end,
        });
      }
    }

    // --------------------------------------------------
    // VALIDATE APPOINTMENT TIME
    // --------------------------------------------------

    const startTime = new Date(bookingDate);

    if (
      Number.isNaN(startTime.getTime()) ||
      startTime <= new Date()
    ) {
      return res.status(400).json({
        message: "Please select a valid future appointment time",
      });
    }

    const durationMinutes = Number(service.duration);
    const intervalMinutes = Number(
      service.slotIntervalMinutes ?? 30
    );
    const bufferMinutes = Number(service.bufferMinutes ?? 0);

    if (
      ![15, 20, 30, 45, 60].includes(durationMinutes) ||
      ![5, 10, 15, 20, 30].includes(intervalMinutes) ||
      ![0, 5, 10, 15].includes(bufferMinutes)
    ) {
      return res.status(400).json({
        message: "Invalid service scheduling settings",
      });
    }

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(startTime.getTime() + IST_OFFSET_MS);

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const hours = business.workingHours?.[
      dayNames[istDate.getUTCDay()]
    ];

    if (
      !hours ||
      hours.closed ||
      typeof hours.open !== "string" ||
      typeof hours.close !== "string" ||
      !/^\d{2}:\d{2}$/.test(hours.open) ||
      !/^\d{2}:\d{2}$/.test(hours.close)
    ) {
      return res.status(400).json({
        message: "Business is closed or has invalid working hours",
      });
    }

    const startMinutes =
      istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

    const [openHour, openMinute] = hours.open.split(":").map(Number);
    const [closeHour, closeMinute] = hours.close.split(":").map(Number);

    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (
      startMinutes < openMinutes ||
      startMinutes + durationMinutes + bufferMinutes > closeMinutes ||
      (startMinutes - openMinutes) % intervalMinutes !== 0 ||
      istDate.getUTCSeconds() !== 0 ||
      istDate.getUTCMilliseconds() !== 0
    ) {
      return res.status(400).json({
        message:
          "This appointment time is outside working hours or does not match the service's available time intervals.",
      });
    }

    const endTime = new Date(
      startTime.getTime() + durationMinutes * 60000
    );

    const bookingSlot =
      `${businessId}_${startTime.toISOString()}`;

    const teamEnabled = isTeamManagementEnabled(business);

    if (isHealthcareBusiness(business) && !teamEnabled) {
  return res.status(403).json({
    message:
      "Healthcare bookings require an active Team Management subscription and eligible staff.",
  });
}

    // --------------------------------------------------
    // LEGACY BOOKING FLOW
    // --------------------------------------------------

    if (!teamEnabled) {
      const existingBookings = await Booking.find({
        businessId,
        status: { $in: ["pending", "confirmed"] },
      }).populate("serviceId", "duration bufferMinutes");

      const conflict = hasBookingConflict({
        bookings: existingBookings,
        startTime,
        endTime,
        bufferMinutes,
      });

      if (conflict) {
        return res.status(409).json({
          message:
            "This time overlaps an existing appointment. Please select another time.",
        });
      }

      const booking = await Booking.create({
        businessId,
        serviceId,
        customerName: cleanName,
        customerPhone: cleanPhone,
        bookingDate: startTime,
        bookingSlot,
      });

      await sendNewBookingNotifications(booking, cleanName, cleanPhone);

      return res.status(201).json({
        message: "Booking created successfully",
        booking,
      });
    }

    // --------------------------------------------------
    // AUTOMATIC TEAM ASSIGNMENT
    // --------------------------------------------------

    const candidates = await getEligibleStaffForSlot({
      business,
      service,
      startTime,
      endTime,
    });

    if (!candidates.length) {
      return res.status(409).json({
        message:
          "No eligible team member is available at this time. Please select another slot.",
      });
    }

    let createdBooking = null;
    let assignedStaff = null;
    let lastError = null;

    // Each candidate is attempted in its own transaction.
    // A duplicate lock means another booking won that staff slot.
    for (const candidate of candidates) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const freshBusiness = await User.findById(businessId).session(session);

          if (!freshBusiness || !isTeamManagementEnabled(freshBusiness)) {
            throw new Error("TEAM_SUBSCRIPTION_INACTIVE");
          }

          const freshStaff = await Staff.findOne({
            _id: candidate._id,
            businessId,
            isActive: true,
          }).session(session);

          if (!freshStaff) {
            throw new Error("STAFF_NO_LONGER_AVAILABLE");
          }

          const booking = new Booking({
            businessId,
            serviceId,
            customerName: cleanName,
            customerPhone: cleanPhone,
            bookingDate: startTime,
            bookingSlot,
            assignedStaffId: freshStaff._id,
            staffAssignmentHistory: [{
              action: "assigned",
              staffId: freshStaff._id,
              staffName: freshStaff.name,
              assignmentType: "automatic",
              changedBy: null,
              changedByName: "Automatic assignment",
              changedAt: new Date(),
            }],
          });

          await booking.save({ session });

          await reserveStaffBookingLocks({
            businessId,
            staffId: freshStaff._id,
            bookingId: booking._id,
            startTime,
            endTime,
            bufferMinutes,
            session,
          });

          createdBooking = booking;
          assignedStaff = freshStaff;
        });

        if (createdBooking) {
          break;
        }
      } catch (error) {
        lastError = error;

        if (error.code === 11000) {
          // This staff member's slot was taken concurrently.
          continue;
        }

        throw error;
      } finally {
        await session.endSession();
      }
    }

    if (!createdBooking) {
      console.error("Automatic staff assignment failed:", lastError);

      return res.status(409).json({
        message:
          "The available team members were just booked. Please select another time.",
      });
    }

    await sendNewBookingNotifications(
      createdBooking,
      cleanName,
      cleanPhone
    );

    return res.status(201).json({
      message: "Booking created and team member assigned successfully",
      booking: createdBooking,
      assignedStaff: {
        _id: assignedStaff._id,
        name: assignedStaff.name,
        designation: assignedStaff.designation,
      },
    });
  } catch (error) {
    console.error("Public booking error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This time slot was just booked. Please select another time.",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
});




// GET STAFF WORK HISTORY
router.get(
  "/staff/:staffId/work-history",
  authMiddleware,
  requireFeature("staff_management"),
  async (req, res) => {
    try {
      const { staffId } = req.params;
      const businessId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(staffId)) {
        return res.status(400).json({
          message: "Invalid staff ID.",
        });
      }

      // Verify that this staff member belongs to the logged-in business.
      // Do not filter by isActive: inactive staff need historical access.
      const staffMember = await Staff.findOne({
        _id: staffId,
        businessId,
      }).select("name designation isActive");

      if (!staffMember) {
        return res.status(404).json({
          message: "Team member not found.",
        });
      }

      // Include both current and previous assignments.
      const bookings = await Booking.find({
        businessId,
        $or: [
          { assignedStaffId: staffId },
          { "staffAssignmentHistory.staffId": staffId },
        ],
      })
        .populate("serviceId", "name price duration")
        .sort({ bookingDate: -1 })
        .lean();

      const now = new Date();

      const appointments = bookings.map((booking) => {
        const assignmentHistory = (
          booking.staffAssignmentHistory || []
        ).filter(
          (event) =>
            String(event.staffId?._id || event.staffId) ===
            String(staffId)
        );

        return {
          ...booking,
          staffAssignmentHistory: assignmentHistory,
        };
      });

      const summary = {
        total: appointments.length,
        completed: appointments.filter(
          (item) => item.status === "completed"
        ).length,
        cancelled: appointments.filter(
          (item) => item.status === "cancelled"
        ).length,
        noShow: appointments.filter(
          (item) => item.status === "no_show"
        ).length,
        upcoming: appointments.filter(
          (item) =>
            ["pending", "confirmed"].includes(item.status) &&
            new Date(item.bookingDate) >= now
        ).length,
      };

      return res.status(200).json({
        staff: staffMember,
        summary,
        appointments,
      });
    } catch (error) {
      console.error("Staff work history error:", error);

      return res.status(500).json({
        message: "Unable to load staff work history.",
      });
    }
  }
);



// Get bookings for a business
router.get("/business/:businessId", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.businessId) {
      return res.status(403).json({
        message: "You are not allowed to view these bookings",
      });
    }

    const bookings = await Booking.find({
      businessId: req.params.businessId,
    })
      .populate(
        "serviceId",
        "name price duration slotIntervalMinutes bufferMinutes"
      )
      .populate("assignedStaffId", "name designation")
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
    const { phone, businessId } = req.query;

    // Phone number is always required.
    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    // Validate businessId only when supplied.
    if (
      businessId &&
      !mongoose.Types.ObjectId.isValid(String(businessId))
    ) {
      return res.status(400).json({
        message: "Invalid business ID",
      });
    }

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      return res.status(400).json({
        message: "Valid phone number is required",
      });
    }

    // Always search by the normalized customer phone.
    const bookingQuery = {
      customerPhone: cleanPhone,
    };

    // Preserve the existing single-business behavior
    // when the website supplies businessId.
    if (businessId) {
      bookingQuery.businessId = businessId;
    }

const bookings = await Booking.find(bookingQuery)
  .populate(
    "serviceId",
    "name price duration slotIntervalMinutes bufferMinutes"
  )
  .populate("businessId", "businessName businessSlug")
  .sort({ bookingDate: -1 });

    return res.json(bookings);
  } catch (error) {
    console.log("Customer bookings error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});


// router.get("/customer", async (req, res) => {
//   try {
//     const { phone, businessId } = req.query;

//     if (!phone || !businessId) {
//       return res.status(400).json({
//         message: "Phone number and business ID are required",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(String(businessId))) {
//       return res.status(400).json({
//         message: "Invalid business ID",
//       });
//     }

//     const cleanPhone = normalizePhone(phone);

//     if (!cleanPhone) {
//       return res.status(400).json({
//         message: "Valid phone number is required",
//       });
//     }

//     const bookings = await Booking.find({
//       businessId,
//       customerPhone: cleanPhone,
//     })
//       .populate(
//         "serviceId",
//         "name price duration slotIntervalMinutes bufferMinutes"
//       )
//       .sort({ bookingDate: -1 });

//     return res.json(bookings);
//   } catch (error) {
//     console.log("Customer bookings error:", error);

//     return res.status(500).json({
//       message: "Server error",
//     });
//   }
// });




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
  let session;

  try {
    const { bookingDate } = req.body;

    if (!bookingDate) {
      return res.status(400).json({
        message: "New booking date is required",
      });
    }

    const newStartTime = new Date(bookingDate);

    if (Number.isNaN(newStartTime.getTime())) {
      return res.status(400).json({
        message: "Invalid booking date",
      });
    }

    const booking = await Booking.findById(req.params.id).populate(
      "serviceId",
      "name price duration slotIntervalMinutes bufferMinutes staffIds"
    );

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
        message: "You are not allowed to modify this booking",
      });
    }

    if (
      booking.status !== "pending" &&
      booking.status !== "confirmed"
    ) {
      return res.status(400).json({
        message:
          "Only pending or confirmed bookings can be rescheduled",
      });
    }

    const business = await User.findById(booking.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    if (!booking.serviceId) {
      return res.status(400).json({
        message: "Booking service could not be found",
      });
    }

    // --------------------------------------------------
    // INDIA TIME AND BUSINESS WORKING HOURS
    // --------------------------------------------------

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

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

    const dayName = dayNames[istDate.getUTCDay()];
    const hours = business.workingHours?.[dayName];

    if (!hours || hours.closed) {
      return res.status(400).json({
        message: "Business is closed on this day",
      });
    }

    const indiaHour = istDate.getUTCHours();
    const indiaMinute = istDate.getUTCMinutes();

    const startMinutes = indiaHour * 60 + indiaMinute;

    const [openHour, openMinute] = hours.open
      .split(":")
      .map(Number);

    const [closeHour, closeMinute] = hours.close
      .split(":")
      .map(Number);

    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    // --------------------------------------------------
    // SERVICE SCHEDULING VALIDATION
    // --------------------------------------------------

    const durationMinutes = Number(
      booking.serviceId.duration
    );

    const intervalMinutes = Number(
      booking.serviceId.slotIntervalMinutes ?? 30
    );

    const bufferMinutes = Number(
      booking.serviceId.bufferMinutes ?? 0
    );

    if (
      ![15, 20, 30, 45, 60].includes(durationMinutes) ||
      ![5, 10, 15, 20, 30].includes(intervalMinutes) ||
      ![0, 5, 10, 15].includes(bufferMinutes) ||
      !Number.isInteger(openHour) ||
      !Number.isInteger(openMinute) ||
      !Number.isInteger(closeHour) ||
      !Number.isInteger(closeMinute) ||
      openHour < 0 ||
      openHour > 23 ||
      closeHour < 0 ||
      closeHour > 23 ||
      openMinute < 0 ||
      openMinute > 59 ||
      closeMinute < 0 ||
      closeMinute > 59 ||
      closeMinutes <= openMinutes
    ) {
      return res.status(400).json({
        message: "Invalid service or business scheduling settings",
      });
    }

    const endMinutes = startMinutes + durationMinutes;

    if (
      startMinutes < openMinutes ||
      endMinutes + bufferMinutes > closeMinutes ||
      (startMinutes - openMinutes) % intervalMinutes !== 0 ||
      istDate.getUTCSeconds() !== 0 ||
      istDate.getUTCMilliseconds() !== 0
    ) {
      return res.status(400).json({
        message:
          "This appointment time is outside working hours or does not match the service's available time intervals.",
      });
    }

    // --------------------------------------------------
    // DO NOT ALLOW PAST APPOINTMENTS
    // --------------------------------------------------

    if (newStartTime <= new Date()) {
      return res.status(400).json({
        message:
          "You cannot reschedule an appointment to a past time",
      });
    }

    const newEndTime = new Date(
      newStartTime.getTime() +
        durationMinutes * 60 * 1000
    );

    const bookingSlot =
      `${booking.businessId}_${newStartTime.toISOString()}`;

    const oldBookingDate = booking.bookingDate;
    const oldAssignedStaffId = booking.assignedStaffId
      ? booking.assignedStaffId.toString()
      : null;

    // --------------------------------------------------
    // CHECK WHETHER TEAM MANAGEMENT IS ACTIVE
    // --------------------------------------------------

    const teamEnabled = isTeamManagementEnabled(business);

    if (isHealthcareBusiness(business) && !teamEnabled) {
  return res.status(403).json({
    message:
      "Healthcare bookings require an active Team Management subscription and eligible staff.",
  });
}

    let updatedBookingId = booking._id;

    // --------------------------------------------------
    // TEAM MANAGEMENT: AUTOMATIC STAFF ASSIGNMENT
    // --------------------------------------------------

    if (teamEnabled) {
      let successfullyRescheduled = false;
      let noEligibleStaff = false;

      // Retry with the next available staff member if
      // another booking reserves the selected member's time.
      for (let attempt = 0; attempt < 10; attempt++) {
        session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {
            const currentBooking = await Booking.findById(
              booking._id
            ).session(session);

            if (
              !currentBooking ||
              !["pending", "confirmed"].includes(
                currentBooking.status
              )
            ) {
              throw new Error(
                "Booking is no longer available for rescheduling"
              );
            }

            // Release old locks inside this transaction.
            // If the transaction fails, the old locks return.
            await releaseBookingLocks({
              bookingId: currentBooking._id,
              session,
            });

            // Recheck eligible staff after releasing the old
            // locks. The helper also checks existing bookings,
            // staff schedules and service eligibility.
            const eligibleStaff = await getEligibleStaffForSlot({
              business,
              service: booking.serviceId,
              startTime: newStartTime,
              endTime: newEndTime,
              bufferMinutes,
              excludeBookingId: currentBooking._id,
              session,
            });

            if (!eligibleStaff.length) {
              noEligibleStaff = true;

              const error = new Error(
                "No eligible team member is available"
              );
              error.code = "NO_ELIGIBLE_STAFF";
              throw error;
            }

            // The first eligible member is selected automatically.
            const selectedStaff = eligibleStaff[0];

const previousBookingDate = currentBooking.bookingDate;

currentBooking.bookingDate = newStartTime;
currentBooking.bookingSlot = bookingSlot;
currentBooking.assignedStaffId = selectedStaff._id;

            if (!Array.isArray(currentBooking.statusHistory)) {
              currentBooking.statusHistory = [];
            }

            currentBooking.statusHistory.push({
              action: "rescheduled",
              status: currentBooking.status,
              oldBookingDate: previousBookingDate,
              newBookingDate: newStartTime,
              changedBy: req.user.id,
              changedByName: req.user.name || "Business owner",
              changedAt: new Date(),
            });

            if (
              !Array.isArray(
                currentBooking.staffAssignmentHistory
              )
            ) {
              currentBooking.staffAssignmentHistory = [];
            }

            const newStaffId = selectedStaff._id.toString();

            if (oldAssignedStaffId !== newStaffId) {
              currentBooking.staffAssignmentHistory.push({
                action: oldAssignedStaffId
                  ? "reassigned"
                  : "assigned",
                staffId: selectedStaff._id,
                staffName: selectedStaff.name,
                assignmentType: "automatic",
                changedBy: req.user.id,
                changedByName:
                  req.user.name || "Business owner",
                changedAt: new Date(),
              });
            }

            currentBooking.reminder24hSentAt = null;
            currentBooking.reminder1hSentAt = null;

            await currentBooking.save({ session });

            // Reserve the new member's appointment time.
            // A duplicate-key error aborts this transaction.
            await reserveStaffBookingLocks({
              businessId: currentBooking.businessId,
              staffId: selectedStaff._id,
              bookingId: currentBooking._id,
              startTime: newStartTime,
              endTime: newEndTime,
              bufferMinutes,
              session,
            });

            updatedBookingId = currentBooking._id;
          });

          successfullyRescheduled = true;
          break;
        } catch (transactionError) {
          if (
            transactionError.code === "NO_ELIGIBLE_STAFF"
          ) {
            noEligibleStaff = true;
            break;
          }

          // A concurrent booking may have taken the selected
          // staff member's time. Retry and find another member.
          if (transactionError.code === 11000) {
            continue;
          }

          throw transactionError;
        } finally {
          await session.endSession();
          session = null;
        }
      }

      if (noEligibleStaff) {
        return res.status(409).json({
          message:
            "No eligible team member is available at this time. Please select another time.",
        });
      }

      if (!successfullyRescheduled) {
        return res.status(409).json({
          message:
            "This time was just booked by another customer. Please select another time.",
        });
      }
    } else {
      // --------------------------------------------------
      // LEGACY MODE: BUSINESS-WIDE CONFLICT CHECK
      // --------------------------------------------------

      const existingBookings = await Booking.find({
        businessId: booking.businessId,
        _id: { $ne: booking._id },
        status: { $in: ["pending", "confirmed"] },
      }).populate("serviceId", "duration bufferMinutes");

      const hasConflict = hasBookingConflict({
        bookings: existingBookings,
        startTime: newStartTime,
        endTime: newEndTime,
        bufferMinutes,
      });

      if (hasConflict) {
        return res.status(409).json({
          message:
            "This time slot is already booked. Please select another time.",
        });
      }

      // Update the booking and release any old staff locks
      // together, so the booking cannot lose its old reservation
      // if the database update fails.
      session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentBooking = await Booking.findById(
            booking._id
          ).session(session);

          if (
            !currentBooking ||
            !["pending", "confirmed"].includes(
              currentBooking.status
            )
          ) {
            throw new Error(
              "Booking is no longer available for rescheduling"
            );
          }

          await releaseBookingLocks({
            bookingId: currentBooking._id,
            session,
          });

const previousBookingDate = currentBooking.bookingDate;

currentBooking.bookingDate = newStartTime;
currentBooking.bookingSlot = bookingSlot;

          if (currentBooking.assignedStaffId) {
            if (
              !Array.isArray(
                currentBooking.staffAssignmentHistory
              )
            ) {
              currentBooking.staffAssignmentHistory = [];
            }

            currentBooking.staffAssignmentHistory.push({
              action: "unassigned",
              staffId: currentBooking.assignedStaffId,
              assignmentType: "automatic",
              changedBy: req.user.id,
              changedByName:
                req.user.name || "Business owner",
              changedAt: new Date(),
            });

            currentBooking.assignedStaffId = null;
          }

          if (!Array.isArray(currentBooking.statusHistory)) {
            currentBooking.statusHistory = [];
          }

          currentBooking.statusHistory.push({
            action: "rescheduled",
            status: currentBooking.status,
            oldBookingDate: previousBookingDate,
            newBookingDate: newStartTime,
            changedBy: req.user.id,
            changedByName: req.user.name || "Business owner",
            changedAt: new Date(),
          });

          currentBooking.reminder24hSentAt = null;
          currentBooking.reminder1hSentAt = null;

          await currentBooking.save({ session });
        });
      } finally {
        await session.endSession();
        session = null;
      }
    }

    // --------------------------------------------------
    // LOAD UPDATED BOOKING
    // --------------------------------------------------

    const updatedBooking = await Booking.findById(
      updatedBookingId
    ).populate(
      "serviceId",
      "name price duration slotIntervalMinutes bufferMinutes"
    ).populate(
      "assignedStaffId",
      "name designation"
    );

    if (!updatedBooking) {
      return res.status(404).json({
        message: "Updated booking could not be found",
      });
    }

    // --------------------------------------------------
    // FORMAT INDIA TIME
    // --------------------------------------------------

    const formattedDate = newStartTime.toLocaleString(
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
      customerPhone: normalizePhone(
        updatedBooking.customerPhone
      ),
      type: "booking_rescheduled",
      title: "Booking rescheduled",
      message:
        `Your appointment has been rescheduled to ${formattedDate}.`,
      bookingId: updatedBooking._id,
    });

    console.log(
      "BOOKEASY: Sending customer reschedule push:",
      updatedBooking._id.toString()
    );

    await sendPushForNotification(rescheduledNotification);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.json({
      message: "Booking rescheduled successfully",
      booking: updatedBooking,
      oldBookingDate,
      newBookingDate: newStartTime,
    });
  } catch (error) {
    console.error("Business reschedule error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This time slot was just booked by another customer. Please select another time.",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
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
        message: "You are not allowed to modify this booking",
      });
    }

    // Record confirmation only when the status actually changes.
    if (booking.status !== "confirmed") {
      booking.status = "confirmed";

      booking.statusHistory.push({
        action: "confirmed",
        status: "confirmed",
        changedBy: req.user.id,
        changedByName: req.user.name || "",
        changedAt: new Date(),
      });

      await booking.save();
    }

    const confirmedNotification = await Notification.create({
      customerPhone: normalizePhone(booking.customerPhone),
      type: "booking_confirmed",
      title: "Booking confirmed",
      message: "Your booking has been confirmed.",
      bookingId: booking._id,
    });

    await sendPushForNotification(confirmedNotification);

    return res.json({
      message: "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});


// Cancel booking

router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  let session;

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
        message: "You are not allowed to modify this booking",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        message: "This booking is already cancelled",
      });
    }

    session = await mongoose.startSession();

    let updatedBooking;

    try {
      await session.withTransaction(async () => {
        const currentBooking = await Booking.findById(
          req.params.id
        ).session(session);

        if (!currentBooking) {
          throw new Error("Booking not found");
        }

        if (currentBooking.status === "cancelled") {
          throw new Error("This booking is already cancelled");
        }

        if (!Array.isArray(currentBooking.statusHistory)) {
          currentBooking.statusHistory = [];
        }

        currentBooking.status = "cancelled";

currentBooking.statusHistory.push({
  action: "cancelled",
  status: "cancelled",
  changedBy: req.user.id,
  changedByName: req.user.name || "Business owner",
  changedAt: new Date(),
});

        await currentBooking.save({ session });

        // Release all staff reservations for this booking.
        await releaseBookingLocks({
          bookingId: currentBooking._id,
          session,
        });

        updatedBooking = currentBooking;
      });
    } finally {
      await session.endSession();
      session = null;
    }

    // Notify the customer after the transaction succeeds.
    const cancelledNotification = await Notification.create({
      customerPhone: normalizePhone(updatedBooking.customerPhone),
      type: "booking_cancelled",
      title: "Booking cancelled",
      message:
        "Your booking has been cancelled by the business.",
      bookingId: updatedBooking._id,
    });

    console.log("BOOKEASY: CANCELLATION NOTIFICATION CREATED", {
      bookingId: updatedBooking._id.toString(),
      customerPhone: normalizePhone(updatedBooking.customerPhone),
      notificationId: cancelledNotification._id.toString(),
      type: cancelledNotification.type,
    });

    await sendPushForNotification(cancelledNotification);

    return res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    if (error.message === "This booking is already cancelled") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.message === "Booking not found") {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});





/**
 * Complete a booking.
 * Only the owning business can complete an active appointment.
 */

router.patch("/:id/complete", authMiddleware, async (req, res) => {
  let session;

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.businessId.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this booking",
      });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending or confirmed bookings can be completed",
      });
    }

    if (new Date(booking.bookingDate) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "A future appointment cannot be completed",
      });
    }

    session = await mongoose.startSession();

    let updatedBooking;

    try {
      await session.withTransaction(async () => {
        const currentBooking = await Booking.findById(
          req.params.id
        ).session(session);

        if (!currentBooking) {
          throw new Error("Booking not found");
        }

        if (!["pending", "confirmed"].includes(currentBooking.status)) {
          throw new Error(
            "Only pending or confirmed bookings can be completed"
          );
        }

        if (new Date(currentBooking.bookingDate) > new Date()) {
          throw new Error(
            "A future appointment cannot be completed"
          );
        }

        if (!Array.isArray(currentBooking.statusHistory)) {
          currentBooking.statusHistory = [];
        }

        currentBooking.status = "completed";

        currentBooking.statusHistory.push({
          action: "completed",
          status: "completed",
          changedBy: req.user.id,
          changedByName: req.user.name || "Business owner",
          changedAt: new Date(),
        });

        await currentBooking.save({ session });

        // Release staff reservations after successful completion.
        await releaseBookingLocks({
          bookingId: currentBooking._id,
          session,
        });

        updatedBooking = currentBooking;
      });
    } finally {
      await session.endSession();
      session = null;
    }

    // Award loyalty only after the completion transaction commits.
    let loyaltyResult = {
      awarded: false,
      reason: "NOT_PROCESSED",
    };

    try {
      loyaltyResult = await awardLoyaltyVisit(updatedBooking);
    } catch (loyaltyError) {
      console.error(
        "Loyalty visit processing error:",
        loyaltyError
      );

      loyaltyResult = {
        awarded: false,
        reason: "LOYALTY_PROCESSING_ERROR",
      };
    }

    // Notify customer after successful completion.
    try {
      const completedNotification = await Notification.create({
        customerPhone: normalizePhone(updatedBooking.customerPhone),
        type: "booking_completed",
        title: "Booking completed",
        message:
          "Your booking has been completed. Thank you for choosing us!",
        bookingId: updatedBooking._id,
      });

      await sendPushForNotification(completedNotification);
    } catch (notificationError) {
      console.error(
        "Booking completion notification error:",
        notificationError
      );
    }

    return res.json({
      success: true,
      message: "Booking completed successfully",
      booking: updatedBooking,
      loyalty: loyaltyResult,
    });
  } catch (error) {
    console.error("Complete booking error:", error);

    if (error.message === "Booking not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
        "Only pending or confirmed bookings can be completed" ||
      error.message === "A future appointment cannot be completed"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
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
    let session;

    try {
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      if (
        booking.businessId.toString() !==
        req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to update this booking.",
        });
      }

      if (!["pending", "confirmed"].includes(booking.status)) {
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
            "A future appointment cannot be marked as a no-show.",
        });
      }

      session = await mongoose.startSession();

      let updatedBooking;

      try {
        await session.withTransaction(async () => {
          const currentBooking = await Booking.findById(
            req.params.id
          ).session(session);

          if (!currentBooking) {
            throw new Error("Booking not found");
          }

          if (!["pending", "confirmed"].includes(currentBooking.status)) {
            throw new Error(
              "Only pending or confirmed appointments can be marked as no-show."
            );
          }

          if (new Date(currentBooking.bookingDate) > new Date()) {
            throw new Error(
              "A future appointment cannot be marked as a no-show."
            );
          }

currentBooking.status = "no_show";

if (!Array.isArray(currentBooking.statusHistory)) {
  currentBooking.statusHistory = [];
}

currentBooking.statusHistory.push({
  action: "no_show",
  status: "no_show",
  changedBy: req.user.id,
  changedByName: req.user.name || "Business owner",
  changedAt: new Date(),
});

          await currentBooking.save({ session });

          // Release staff reservations for the no-show booking.
          await releaseBookingLocks({
            bookingId: currentBooking._id,
            session,
          });

          updatedBooking = currentBooking;
        });
      } finally {
        await session.endSession();
        session = null;
      }

      return res.json({
        success: true,
        message: "Appointment marked as no-show.",
        booking: updatedBooking,
      });
    } catch (error) {
      console.error("Mark no-show error:", error);

      if (error.message === "Booking not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (
        error.message.includes("Only pending or confirmed") ||
        error.message.includes("future appointment")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to mark appointment as no-show.",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }
);



export default router;
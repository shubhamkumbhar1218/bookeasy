import express from "express";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Get available booking slots
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

    const bookings = await Booking.find(
      bookingQuery
    ).populate(
      "serviceId",
      "duration"
    );

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

      /*
       * IMPORTANT:
       *
       * The selected time is an India local time.
       *
       * Example:
       * 2026-10-05 09:00 IST
       *
       * becomes:
       * 2026-10-05 03:30 UTC
       *
       * Render runs in UTC, so we must NOT use:
       *
       * new Date("2026-10-05T09:00:00")
       *
       * because that can be interpreted using the
       * server timezone.
       */

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

      const conflict =
        bookings.some((booking) => {
          if (!booking.serviceId) {
            return false;
          }

          const bookingStart =
            new Date(
              booking.bookingDate
            );

          const bookingEnd =
            new Date(
              bookingStart.getTime() +
                booking.serviceId.duration *
                  60 *
                  1000
            );

          return (
            slotDate < bookingEnd &&
            slotEnd > bookingStart
          );
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
// router.get("/availability", async (req, res) => {
//   try {
//     const {
//       businessId,
//       serviceId,
//       date,
//       excludeBookingId,
//     } = req.query;

//     if (!businessId || !serviceId || !date) {
//       return res.status(400).json({
//         message:
//           "businessId, serviceId and date are required",
//       });
//     }

//     // --------------------------------------------------
//     // FIND BUSINESS
//     // --------------------------------------------------

//     const business = await User.findById(businessId);

//     if (!business) {
//       return res.status(404).json({
//         message: "Business not found",
//       });
//     }

//     // --------------------------------------------------
//     // FIND SERVICE
//     // --------------------------------------------------

//     const service = await Service.findOne({
//       _id: serviceId,
//       businessId,
//       isActive: true,
//     });

//     if (!service) {
//       return res.status(404).json({
//         message: "Service not found",
//       });
//     }

//     // --------------------------------------------------
//     // SELECTED DATE
//     // --------------------------------------------------

//     const selectedDate = new Date(
//       `${date}T00:00:00`
//     );

//     if (isNaN(selectedDate.getTime())) {
//       return res.status(400).json({
//         message: "Invalid date",
//       });
//     }

//     // --------------------------------------------------
//     // DAY NAME
//     // --------------------------------------------------

//     const dayNames = [
//       "sunday",
//       "monday",
//       "tuesday",
//       "wednesday",
//       "thursday",
//       "friday",
//       "saturday",
//     ];

//     const dayName =
//       dayNames[selectedDate.getDay()];

//     // --------------------------------------------------
//     // WORKING HOURS
//     // --------------------------------------------------

//     const hours =
//       business.workingHours?.[dayName];

//     if (!hours || hours.closed) {
//       return res.json({
//         date,
//         slots: [],
//         message: "Business is closed",
//       });
//     }

//     const [openHour, openMinute] =
//       hours.open.split(":").map(Number);

//     const [closeHour, closeMinute] =
//       hours.close.split(":").map(Number);

//     const openMinutes =
//       openHour * 60 + openMinute;

//     const closeMinutes =
//       closeHour * 60 + closeMinute;

//     // --------------------------------------------------
//     // GET EXISTING BOOKINGS
//     // --------------------------------------------------

//     const bookingQuery = {
//       businessId,
//       status: {
//         $in: ["pending", "confirmed"],
//       },
//     };

//     // IMPORTANT:
//     // When rescheduling, don't consider the
//     // booking itself as a conflict.
//     if (excludeBookingId) {
//       bookingQuery._id = {
//         $ne: excludeBookingId,
//       };
//     }

//     const bookings = await Booking.find(
//       bookingQuery
//     ).populate(
//       "serviceId",
//       "duration"
//     );

//     // --------------------------------------------------
//     // CREATE AVAILABLE SLOTS
//     // --------------------------------------------------

//     const slots = [];

//     const now = new Date();

//     for (
//       let minutes = openMinutes;
//       minutes + service.duration <= closeMinutes;
//       minutes += 30
//     ) {
//       const hour = Math.floor(
//         minutes / 60
//       );

//       const minute = minutes % 60;

//       const slotDate = new Date(
//         `${date}T${String(hour).padStart(
//           2,
//           "0"
//         )}:${String(minute).padStart(
//           2,
//           "0"
//         )}:00`
//       );

//       const slotEnd = new Date(
//         slotDate.getTime() +
//           service.duration *
//             60 *
//             1000
//       );

//       // Don't show past slots
//       if (slotDate <= now) {
//         continue;
//       }

//       // ------------------------------------------------
//       // CHECK OVERLAP
//       // ------------------------------------------------

//       const conflict =
//         bookings.some((booking) => {
//           if (!booking.serviceId) {
//             return false;
//           }

//           const bookingStart =
//             new Date(
//               booking.bookingDate
//             );

//           const bookingEnd =
//             new Date(
//               bookingStart.getTime() +
//                 booking.serviceId.duration *
//                   60 *
//                   1000
//             );

//           return (
//             slotDate < bookingEnd &&
//             slotEnd > bookingStart
//           );
//         });

//       if (!conflict) {
//         slots.push({
//           value:
//             slotDate.toISOString(),

//           label:
//             slotDate.toLocaleTimeString(
//               "en-IN",
//               {
//                 hour: "2-digit",
//                 minute: "2-digit",
//               }
//             ),
//         });
//       }
//     }

//     res.json({
//       date,
//       slots,
//     });
//   } catch (error) {
//     console.log(
//       "Availability error:",
//       error
//     );

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });



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

    const bookingSlot =
      `${businessId}_${startTime.toISOString()}`;

    // --------------------------------------------------
    // CHECK EXISTING ACTIVE BOOKINGS
    // --------------------------------------------------

    const existingBookings =
      await Booking.find({
        businessId,
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

    const hasConflict =
      existingBookings.some(
        (booking) => {
          if (!booking.serviceId) {
            return false;
          }

          const existingStart =
            new Date(
              booking.bookingDate
            );

          const existingEnd =
            new Date(
              existingStart.getTime() +
                booking.serviceId.duration *
                  60 *
                  1000
            );

          return (
            startTime < existingEnd &&
            endTime > existingStart
          );
        }
      );

    if (hasConflict) {
      return res.status(409).json({
        message:
          "This time slot is already booked",
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
        customerPhone:
          customerPhone.trim(),
        bookingDate: startTime,
        bookingSlot,
      });

    // --------------------------------------------------
    // BUSINESS OWNER NOTIFICATION
    // --------------------------------------------------

    await Notification.create({
      businessId:
        booking.businessId,
      type: "new_booking",
      title: "New appointment",
      message:
        `${customerName.trim()} booked an appointment.`,
      bookingId: booking._id,
    });

    // --------------------------------------------------
    // CUSTOMER NOTIFICATION
    // --------------------------------------------------

    await Notification.create({
      businessId,
      customerPhone:
        customerPhone.trim(),
      type: "new_booking",
      title: "Booking received",
      message:
        "Your appointment has been booked successfully.",
      bookingId: booking._id,
    });

    return res.status(201).json({
      message:
        "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.log(
      "Public booking error:",
      error
    );

    // Duplicate bookingSlot
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
// router.post("/public", async (req, res) => {
//   try {
//     const {
//       businessId,
//       serviceId,
//       customerName,
//       customerPhone,
//       bookingDate,
//     } = req.body;

//     if (
//       !businessId ||
//       !serviceId ||
//       !customerName ||
//       !customerPhone ||
//       !bookingDate
//     ) {
//       return res.status(400).json({
//         message: "All booking fields are required",
//       });
//     }

//     // Find service
//     const service = await Service.findOne({
//       _id: serviceId,
//       businessId,
//       isActive: true,
//     });

//     if (!service) {
//       return res.status(404).json({
//         message: "Service not found",
//       });
//     }

//     const startTime = new Date(bookingDate);

//     if (isNaN(startTime.getTime())) {
//       return res.status(400).json({
//         message: "Invalid booking date",
//       });
//     }

//     // Calculate service end time
//     const endTime = new Date(
//       startTime.getTime() + service.duration * 60 * 1000
//     );

//     // Get existing bookings for this business
//     const existingBookings = await Booking.find({
//       businessId,
//       status: {
//         $in: ["pending", "confirmed"],
//       },
//     }).populate("serviceId", "duration");

//     // Check time overlap
//     const hasConflict = existingBookings.some((booking) => {
//       const existingStart = new Date(booking.bookingDate);

//       const existingEnd = new Date(
//         existingStart.getTime() +
//           booking.serviceId.duration * 60 * 1000
//       );

//       return startTime < existingEnd && endTime > existingStart;
//     });

//     if (hasConflict) {
//       return res.status(409).json({
//         message: "This time slot is already booked",
//       });
//     }

//     // Create booking
//     const booking = await Booking.create({
//       businessId,
//       serviceId,
//       customerName,
//       customerPhone,
//       bookingDate: startTime,
//       bookingSlot:
//         `${businessId}_${startTime.toISOString()}`,
//     });


// // 🔔 Business owner notification
// await Notification.create({
//   businessId: booking.businessId,
//   type: "new_booking",
//   title: "New appointment",
//   message: `${customerName} booked an appointment.`,
//   bookingId: booking._id,
// });

// await Notification.create({
//   businessId,
//   customerPhone: customerPhone.trim(),
//   type: "new_booking",
//   title: "Booking received",
//   message: "Your appointment has been booked successfully.",
//   bookingId: booking._id,
// });

//     res.status(201).json({
//       message: "Booking created successfully",
//       booking,
//     });
// } catch (error) {
//   console.log("Public booking error:", error);

//   // MongoDB duplicate-key error
//   // means another customer already booked
//   // this exact slot.
//   if (error.code === 11000) {
//     return res.status(409).json({
//       message:
//         "This time slot was just booked by another customer. Please select another time.",
//     });
//   }

//   res.status(500).json({
//     message: "Server error",
//   });
// }
// });

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

    const cleanPhone = phone.trim();

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


router.get("/stats/:businessId", authMiddleware, async (req, res) => {
  try {
    const { businessId } = req.params;

    if (businessId !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to view these statistics",
      });
    }

    const bookings = await Booking.find({
      businessId,
    }).populate("serviceId", "name price");

    const totalBookings = bookings.length;

    const pendingBookings = bookings.filter(
      (booking) => booking.status === "pending"
    ).length;

    const confirmedBookings = bookings.filter(
      (booking) => booking.status === "confirmed"
    ).length;

    const cancelledBookings = bookings.filter(
      (booking) => booking.status === "cancelled"
    ).length;

    const completedBookings = bookings.filter(
      (booking) => booking.status === "completed"
    ).length;

    // Total lifetime revenue
const revenue = bookings
  .filter((booking) => booking.status === "completed")
  .reduce((total, booking) => {
    return total + (booking.serviceId?.price || 0);
  }, 0);

// Get today's date in India
const todayIST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
}).format(new Date());

// Calculate today's completed earnings
const todayEarnings = bookings
  .filter((booking) => {
    if (booking.status !== "completed") {
      return false;
    }

    const bookingDateIST = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date(booking.bookingDate));

    return bookingDateIST === todayIST;
  })
  .reduce((total, booking) => {
    return total + (booking.serviceId?.price || 0);
  }, 0);

res.json({
  totalBookings,
  pendingBookings,
  confirmedBookings,
  cancelledBookings,
  completedBookings,
  revenue,
  todayEarnings,
});
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Reschedule booking
// Reschedule booking - Business Owner

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

    const hasConflict =
      existingBookings.some(
        (existingBooking) => {
          if (!existingBooking.serviceId) {
            return false;
          }

          const existingStart =
            new Date(
              existingBooking.bookingDate
            );

          const existingEnd =
            new Date(
              existingStart.getTime() +
                existingBooking.serviceId.duration *
                  60 *
                  1000
            );

          return (
            newStartTime < existingEnd &&
            newEndTime > existingStart
          );
        }
      );

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

    booking.bookingDate =
      newStartTime;

    booking.bookingSlot =
      bookingSlot;

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

    await Notification.create({
      customerPhone:
        booking.customerPhone,
      type: "booking_rescheduled",
      title: "Booking rescheduled",
      message:
        `Your appointment has been rescheduled to ${formattedDate}.`,
      bookingId: booking._id,
    });

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
// router.patch("/:id/reschedule", authMiddleware, async (req, res) => {
//   try {
//     const { bookingDate } = req.body;

//     if (!bookingDate) {
//       return res.status(400).json({
//         message: "New booking date is required",
//       });
//     }

//     const newStartTime = new Date(bookingDate);

//     if (isNaN(newStartTime.getTime())) {
//       return res.status(400).json({
//         message: "Invalid booking date",
//       });
//     }

//     // Find booking
//     const booking = await Booking.findById(req.params.id)
//       .populate("serviceId", "name price duration");

//     if (!booking) {
//       return res.status(404).json({
//         message: "Booking not found",
//       });
//     }

//     // Check business ownership
//     if (booking.businessId.toString() !== req.user.id.toString()) {
//       return res.status(403).json({
//         message: "You are not allowed to modify this booking",
//       });
//     }

//     // Only pending or confirmed bookings
//     if (
//       booking.status !== "pending" &&
//       booking.status !== "confirmed"
//     ) {
//       return res.status(400).json({
//         message:
//           "Only pending or confirmed bookings can be rescheduled",
//       });
//     }

//     // Get business working hours
//     const business = await User.findById(booking.businessId);

//     if (!business) {
//       return res.status(404).json({
//         message: "Business not found",
//       });
//     }

//     // Get day name
//     const dayNames = [
//       "sunday",
//       "monday",
//       "tuesday",
//       "wednesday",
//       "thursday",
//       "friday",
//       "saturday",
//     ];

//     const dayName = dayNames[newStartTime.getDay()];

//     const hours = business.workingHours?.[dayName];

//     if (!hours || hours.closed) {
//       return res.status(400).json({
//         message: "Business is closed on this day",
//       });
//     }

//     // Calculate new booking end time
//     const newEndTime = new Date(
//       newStartTime.getTime() +
//         booking.serviceId.duration * 60 * 1000
//     );

//     // Working hours
//     const [openHour, openMinute] = hours.open
//       .split(":")
//       .map(Number);

//     const [closeHour, closeMinute] = hours.close
//       .split(":")
//       .map(Number);

//     const openTime = new Date(newStartTime);
//     openTime.setHours(openHour, openMinute, 0, 0);

//     const closeTime = new Date(newStartTime);
//     closeTime.setHours(closeHour, closeMinute, 0, 0);

//     // Check if booking is within working hours
//     if (
//       newStartTime < openTime ||
//       newEndTime > closeTime
//     ) {
//       return res.status(400).json({
//         message: `Booking must be between ${hours.open} and ${hours.close}`,
//       });
//     }

//     // Find other active bookings
//     const existingBookings = await Booking.find({
//       businessId: booking.businessId,
//       _id: { $ne: booking._id },
//       status: {
//         $in: ["pending", "confirmed"],
//       },
//     }).populate("serviceId", "duration");

//     // Check time conflict
//     const hasConflict = existingBookings.some(
//       (existingBooking) => {
//         const existingStart = new Date(
//           existingBooking.bookingDate
//         );

//         const existingEnd = new Date(
//           existingStart.getTime() +
//             existingBooking.serviceId.duration * 60 * 1000
//         );

//         return (
//           newStartTime < existingEnd &&
//           newEndTime > existingStart
//         );
//       }
//     );

//     if (hasConflict) {
//       return res.status(409).json({
//         message: "This time slot is already booked",
//       });
//     }

//     // Save old date for notification
//     const oldBookingDate = booking.bookingDate;

//     // Update booking
//     booking.bookingDate = newStartTime;

//     await booking.save();

//     // Notify customer
//     await Notification.create({
//       customerPhone: booking.customerPhone,
//       type: "booking_rescheduled",
//       title: "Booking rescheduled",
//       message: `Your appointment has been rescheduled to ${newStartTime.toLocaleString(
//         "en-IN",
//         {
//           dateStyle: "medium",
//           timeStyle: "short",
//         }
//       )}.`,
//       bookingId: booking._id,
//     });

//     res.json({
//       message: "Booking rescheduled successfully",
//       booking,
//       oldBookingDate,
//       newBookingDate: newStartTime,
//     });
//   } catch (error) {
//     console.log("Business reschedule error:", error);

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });


//Comfirm booking
// Confirm booking
router.patch("/:id/confirm", authMiddleware, async (req, res) => {
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

    booking.status = "confirmed";

    await booking.save();

    await Notification.create({
      customerPhone: booking.customerPhone,
      type: "booking_confirmed",
      title: "Booking confirmed",
      message: "Your booking has been confirmed.",
      bookingId: booking._id,
    });

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

    booking.status = "cancelled";

    await booking.save();

await Notification.create({
  customerPhone: booking.customerPhone,
  type: "booking_cancelled",
  title: "Booking cancelled",
  message: "Your booking has been cancelled by the business.",
  bookingId: booking._id,
});

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


//Complete booking
// Complete booking
router.patch("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    console.log("========== COMPLETE BOOKING DEBUG ==========");
console.log("Booking ID:", booking._id.toString());
console.log("Booking businessId:", booking.businessId.toString());
console.log("Logged-in user id:", req.user.id);
console.log("Logged-in user role:", req.user.role);
console.log("=============================================");

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

    booking.status = "completed";

    await booking.save();

    await Notification.create({
      customerPhone: booking.customerPhone,
      type: "booking_completed",
      title: "Booking completed",
      message:
        "Your booking has been completed. Thank you for choosing us!",
      bookingId: booking._id,
    });

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
export default router;
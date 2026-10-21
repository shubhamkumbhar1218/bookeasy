
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireFeature } from "../middleware/requireFeature.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireFeature("customer_retention"));

function getSegment(customer, now) {
  if (customer.upcomingBookings > 0) return "upcoming";
  if (customer.completedVisits === 0) return "new";

  const daysSinceVisit = Math.floor(
    (now.getTime() - customer.lastVisit.getTime()) /
      (24 * 60 * 60 * 1000)
  );

  if (daysSinceVisit >= 90) return "inactive_90";
  if (daysSinceVisit >= 60) return "inactive_60";
  if (daysSinceVisit >= 30) return "inactive_30";
  if (customer.completedVisits >= 2) return "repeat";

  return "active";
}

function buildCustomers(bookings) {
  const customers = new Map();

  for (const booking of bookings) {
    const phone = String(booking.customerPhone || "").trim();
    if (!phone) continue;

    let customer = customers.get(phone);

    if (!customer) {
      customer = {
        customerName: booking.customerName,
        customerPhone: phone,
        totalBookings: 0,
        completedVisits: 0,
        cancelledBookings: 0,
        noShowBookings: 0,
        upcomingBookings: 0,
        lastVisit: null,
        nextBooking: null,
      };
      customers.set(phone, customer);
    }

    customer.totalBookings++;

    if (booking.status === "completed") {
      customer.completedVisits++;

      if (
        !customer.lastVisit ||
        booking.bookingDate > customer.lastVisit
      ) {
        customer.lastVisit = booking.bookingDate;
      }
    }

    if (booking.status === "cancelled") {
      customer.cancelledBookings++;
    }

    if (booking.status === "no_show") {
      customer.noShowBookings++;
    }

    if (
      ["pending", "confirmed"].includes(booking.status) &&
      booking.bookingDate >= new Date()
    ) {
      customer.upcomingBookings++;

      if (
        !customer.nextBooking ||
        booking.bookingDate < customer.nextBooking
      ) {
        customer.nextBooking = booking.bookingDate;
      }
    }
  }

  return Array.from(customers.values());
}

function getCustomerData(bookings) {
  const now = new Date();

  const customers = buildCustomers(bookings).map((customer) => ({
    ...customer,
    segment: getSegment(customer, now),
    daysSinceVisit: customer.lastVisit
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - customer.lastVisit.getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null,
  }));

  return { now, customers };
}

// GET /api/retention/overview
router.get("/overview", async (req, res) => {
  try {
    const bookings = await Booking.find({
      businessId: req.user.id,
    })
      .select(
        "customerName customerPhone bookingDate status"
      )
      .sort({ bookingDate: -1 })
      .lean();

    const { customers } = getCustomerData(bookings);

    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter(
      (c) => c.completedVisits >= 2
    ).length;

    const completedVisits = customers.reduce(
      (sum, c) => sum + c.completedVisits,
      0
    );

    const inactive30 = customers.filter(
      (c) => c.segment === "inactive_30" ||
        c.segment === "inactive_60" ||
        c.segment === "inactive_90"
    ).length;

    return res.json({
      success: true,
      overview: {
        totalCustomers,
        repeatCustomers,
        repeatCustomerRate: totalCustomers
          ? Number(
              ((repeatCustomers / totalCustomers) * 100).toFixed(1)
            )
          : 0,
        completedVisits,
        inactiveCustomers: inactive30,
        inactive30Days: customers.filter(
          (c) => c.daysSinceVisit >= 30
        ).length,
        inactive60Days: customers.filter(
          (c) => c.daysSinceVisit >= 60
        ).length,
        inactive90Days: customers.filter(
          (c) => c.daysSinceVisit >= 90
        ).length,
        upcomingCustomers: customers.filter(
          (c) => c.upcomingBookings > 0
        ).length,
      },
    });
  } catch (error) {
    console.error("Retention overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load retention overview.",
    });
  }
});

// GET /api/retention/customers?segment=inactive_30
router.get("/customers", async (req, res) => {
  try {
    const allowedSegments = [
      "all",
      "new",
      "active",
      "repeat",
      "upcoming",
      "inactive_30",
      "inactive_60",
      "inactive_90",
    ];

    const segment = req.query.segment || "all";

    if (!allowedSegments.includes(segment)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer segment.",
      });
    }

    const bookings = await Booking.find({
      businessId: req.user.id,
    })
      .select(
        "customerName customerPhone bookingDate status"
      )
      .sort({ bookingDate: -1 })
      .lean();

    const { customers } = getCustomerData(bookings);

    const filtered = segment === "all"
      ? customers
      : customers.filter((c) => c.segment === segment);

    filtered.sort((a, b) => {
      if (!a.lastVisit) return -1;
      if (!b.lastVisit) return 1;
      return b.lastVisit - a.lastVisit;
    });

    return res.json({
      success: true,
      segment,
      count: filtered.length,
      customers: filtered,
    });
  } catch (error) {
    console.error("Retention customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load retention customers.",
    });
  }
});

export default router;

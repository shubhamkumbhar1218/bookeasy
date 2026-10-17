
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";

const CHECK_INTERVAL_MS = 60 * 1000;
const GRACE_PERIOD_MS = 30 * 60 * 1000;

let isRunning = false;
let schedulerStarted = false;

async function expirePastAppointments() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();

    const bookings = await Booking.find({
      status: { $in: ["pending", "confirmed"] },
      bookingDate: { $lt: now },
    }).select("_id serviceId bookingDate status");

    for (const booking of bookings) {
      const service = await Service.findById(booking.serviceId)
        .select("duration");

      // Use the service duration when available; otherwise assume 30 minutes.
      const durationMinutes = Number(service?.duration) || 30;

      const appointmentEndTime =
        new Date(booking.bookingDate).getTime() +
        durationMinutes * 60 * 1000;

      const expiryTime = appointmentEndTime + GRACE_PERIOD_MS;

      if (now.getTime() < expiryTime) continue;

      // Only cancel if the booking is still active.
      await Booking.updateOne(
        {
          _id: booking._id,
          status: { $in: ["pending", "confirmed"] },
        },
        {
          $set: { status: "cancelled" },
        }
      );
    }
  } catch (error) {
    console.error("BookEasy appointment expiry error:", error);
  } finally {
    isRunning = false;
  }
}

export function startAppointmentExpiryScheduler() {
  if (schedulerStarted) return;

  schedulerStarted = true;
  console.log("BookEasy: appointment expiry scheduler started");

  void expirePastAppointments();

  setInterval(() => {
    void expirePastAppointments();
  }, CHECK_INTERVAL_MS);
}

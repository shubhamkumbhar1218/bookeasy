/**
 * Checks whether a proposed appointment overlaps an existing appointment.
 *
 * Rules:
 * - Without an assigned staff member, an appointment blocks the business.
 * - With a staff member assigned, appointments for that same staff member
 *   conflict, as do unassigned appointments.
 * - Appointments assigned to different staff members may overlap.
 */
export function hasBookingConflict({
  bookings,
  startTime,
  endTime,
  staffId = null,
}) {
  const requestedStaffId = staffId
    ? staffId.toString()
    : null;

  return bookings.some((booking) => {
    if (!booking.serviceId?.duration) {
      return false;
    }

    const existingStart = new Date(booking.bookingDate);
    const existingEnd = new Date(
      existingStart.getTime() +
        Number(booking.serviceId.duration) * 60 * 1000
    );

    const overlaps =
      startTime < existingEnd &&
      endTime > existingStart;

    if (!overlaps) {
      return false;
    }

    const existingStaffId = booking.staffId
      ? booking.staffId._id
        ? booking.staffId._id.toString()
        : booking.staffId.toString()
      : null;

    // An unassigned appointment blocks all staff.
    if (!requestedStaffId || !existingStaffId) {
      return true;
    }

    // Different assigned staff members can work simultaneously.
    return requestedStaffId === existingStaffId;
  });
}

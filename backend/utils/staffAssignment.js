import Staff from "../models/Staff.js";
import Booking from "../models/Booking.js";
import BookingSlotLock from "../models/BookingSlotLock.js";
import { getBookingLockMinutes } from "./bookingSlotLocks.js";


const HEALTHCARE_BUSINESS_TYPES = new Set([
  "hospital",
  "dental clinic",
  "doctor / clinic",
  "physiotherapy",
  "diagnostic lab",
  "pet clinic / veterinary",
]);

const requiresExplicitServiceStaff = (business) =>
  HEALTHCARE_BUSINESS_TYPES.has(
    String(business?.businessType || "").trim().toLowerCase()
  );


const ACTIVE_STATUSES = ["pending", "confirmed"];

const getIndiaDateParts = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(date));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: weekdayMap[values.weekday],
    time: `${values.hour}:${values.minute}`,
  };
};

const timeToMinutes = (value) => {
  if (!/^\d{2}:\d{2}$/.test(String(value || ""))) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const isWithinWorkingHours = ({
  workingHours,
  date,
  endTime,
  fallbackWorkingHours,
}) => {
  const startParts = getIndiaDateParts(date);
  const endParts = getIndiaDateParts(endTime);

  // An appointment must start and finish on the same business day.
  if (startParts.dayOfWeek !== endParts.dayOfWeek) {
    return false;
  }

  let opening;
  let closing;

  if (Array.isArray(workingHours) && workingHours.length > 0) {
    const schedule = workingHours.find(
      (item) => Number(item.dayOfWeek) === startParts.dayOfWeek
    );

    if (
      !schedule ||
      schedule.isAvailable !== true
    ) {
      return false;
    }

    opening = schedule.startTime;
    closing = schedule.endTime;
  } else {
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const schedule =
      fallbackWorkingHours?.[dayNames[startParts.dayOfWeek]];

    if (!schedule || schedule.closed === true) {
      return false;
    }

    opening = schedule.open;
    closing = schedule.close;
  }

  const openingMinutes = timeToMinutes(opening);
  const closingMinutes = timeToMinutes(closing);
  const appointmentStart = timeToMinutes(startParts.time);
  const appointmentEnd = timeToMinutes(endParts.time);

  if (
    openingMinutes === null ||
    closingMinutes === null ||
    appointmentStart === null ||
    appointmentEnd === null
  ) {
    return false;
  }

  return (
    appointmentStart >= openingMinutes &&
    appointmentEnd <= closingMinutes
  );
};

const hasOverlap = ({
  existingStart,
  existingEnd,
  proposedStart,
  proposedEnd,
}) => {
  return (
    existingStart < proposedEnd &&
    proposedStart < existingEnd
  );
};

const getExistingBookingEnd = (booking) => {
  const duration = Number(booking.serviceId?.duration);
  const buffer = Number(booking.serviceId?.bufferMinutes || 0);

  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(buffer) ||
    buffer < 0
  ) {
    return null;
  }

  const start = new Date(booking.bookingDate);

  return new Date(
    start.getTime() + (duration + buffer) * 60 * 1000
  );
};

/**
 * Returns active eligible staff members who can take this appointment.
 *
 * Empty service.staffIds means all active staff are eligible.
 * Existing unassigned active bookings block every staff member.
 */
export const getEligibleStaffForSlot = async ({
  business,
  service,
  startTime,
  endTime,
  excludeBookingId = null,
  session = null,
}) => {
  if (!business?._id || !service?._id) {
    throw new Error("Business and service are required.");
  }

  // Healthcare services must explicitly select eligible staff.
if (
  requiresExplicitServiceStaff(business) &&
  (!Array.isArray(service.staffIds) || service.staffIds.length === 0)
) {
  return [];
}

  const proposedStart = new Date(startTime);
  const proposedEnd = new Date(endTime);

  if (
    !Number.isFinite(proposedStart.getTime()) ||
    !Number.isFinite(proposedEnd.getTime()) ||
    proposedEnd <= proposedStart
  ) {
    throw new Error("Invalid appointment time.");
  }

  const bufferMinutes = Number(service.bufferMinutes || 0);

  const proposedOccupiedEnd = new Date(
    proposedEnd.getTime() + bufferMinutes * 60 * 1000
  );

  const staffQuery = {
    businessId: business._id,
    isActive: true,
  };

  if (Array.isArray(service.staffIds) && service.staffIds.length > 0) {
    staffQuery._id = { $in: service.staffIds };
  }

  let staffQueryBuilder = Staff.find(staffQuery).sort({ createdAt: 1 });

  if (session) {
    staffQueryBuilder = staffQueryBuilder.session(session);
  }

  const staffMembers = await staffQueryBuilder;

  if (staffMembers.length === 0) {
    return [];
  }

  const bookingQuery = {
    businessId: business._id,
    status: { $in: ACTIVE_STATUSES },
    assignedStaffId: null,
    bookingDate: { $lt: proposedOccupiedEnd },
  };

  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId };
  }

  let legacyQueryBuilder = Booking.find(bookingQuery).populate(
    "serviceId",
    "duration bufferMinutes"
  );

  if (session) {
    legacyQueryBuilder = legacyQueryBuilder.session(session);
  }

  const unassignedBookings = await legacyQueryBuilder;

  // A legacy active booking without an assigned staff member
  // temporarily blocks all team members during its occupied time.
  const hasLegacyConflict = unassignedBookings.some((booking) => {
    const existingStart = new Date(booking.bookingDate);
    const existingEnd = getExistingBookingEnd(booking);

    if (!existingEnd) {
      // Fail safely if an existing booking has invalid service timing.
      return true;
    }

    return hasOverlap({
      existingStart,
      existingEnd,
      proposedStart,
      proposedEnd: proposedOccupiedEnd,
    });
  });

  if (hasLegacyConflict) {
    return [];
  }

  const lockMinutes = getBookingLockMinutes({
    startTime: proposedStart,
    endTime: proposedEnd,
    bufferMinutes,
  });

  const eligibleStaff = [];

  for (const staff of staffMembers) {
    const workingHoursAvailable = isWithinWorkingHours({
      workingHours: staff.workingHours,
      date: proposedStart,
      endTime: proposedOccupiedEnd,
      fallbackWorkingHours: business.workingHours,
    });

    if (!workingHoursAvailable) {
      continue;
    }

    const lockQuery = BookingSlotLock.findOne({
      staffId: staff._id,
      minuteStart: { $in: lockMinutes },
    });

    if (session) {
      lockQuery.session(session);
    }

    const existingLock = await lockQuery;

    if (existingLock) {
      continue;
    }

    // Also check assigned bookings directly as a safety net
    // for older assignments that might not have lock records.
    const assignedBookingQuery = {
      businessId: business._id,
      assignedStaffId: staff._id,
      status: { $in: ACTIVE_STATUSES },
      bookingDate: { $lt: proposedOccupiedEnd },
    };

    if (excludeBookingId) {
      assignedBookingQuery._id = { $ne: excludeBookingId };
    }

    let assignedQueryBuilder = Booking.find(
      assignedBookingQuery
    ).populate("serviceId", "duration bufferMinutes");

    if (session) {
      assignedQueryBuilder = assignedQueryBuilder.session(session);
    }

    const assignedBookings = await assignedQueryBuilder;

    const hasAssignedConflict = assignedBookings.some((booking) => {
      const existingStart = new Date(booking.bookingDate);
      const existingEnd = getExistingBookingEnd(booking);

      if (!existingEnd) {
        return true;
      }

      return hasOverlap({
        existingStart,
        existingEnd,
        proposedStart,
        proposedEnd: proposedOccupiedEnd,
      });
    });

    if (!hasAssignedConflict) {
      eligibleStaff.push(staff);
    }
  }

  return eligibleStaff;
};

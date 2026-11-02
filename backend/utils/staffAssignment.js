
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

    if (!schedule || schedule.isAvailable !== true) {
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

  if (!Number.isFinite(start.getTime())) {
    return null;
  }

  return new Date(
    start.getTime() + (duration + buffer) * 60 * 1000
  );
};

/**
 * ORIGINAL HELPER
 *
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

  const hasLegacyConflict = unassignedBookings.some((booking) => {
    const existingStart = new Date(booking.bookingDate);
    const existingEnd = getExistingBookingEnd(booking);

    if (
      !Number.isFinite(existingStart.getTime()) ||
      !existingEnd
    ) {
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

      if (
        !Number.isFinite(existingStart.getTime()) ||
        !existingEnd
      ) {
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


/**
 * OPTIMIZED HELPER 1
 *
 * Loads eligible staff, active bookings, and relevant locks once
 * for all candidate availability slots.
 */
export const prepareStaffAvailabilityContext = async ({
  business,
  service,
  candidateSlots,
  excludeBookingId = null,
  session = null,
}) => {
  if (!business?._id || !service?._id) {
    throw new Error("Business and service are required.");
  }

  if (!Array.isArray(candidateSlots) || candidateSlots.length === 0) {
    return {
      staffMembers: [],
      unassignedBookings: [],
      assignedBookingsByStaff: new Map(),
      locksByStaff: new Map(),
    };
  }

  if (
    requiresExplicitServiceStaff(business) &&
    (!Array.isArray(service.staffIds) || service.staffIds.length === 0)
  ) {
    return {
      staffMembers: [],
      unassignedBookings: [],
      assignedBookingsByStaff: new Map(),
      locksByStaff: new Map(),
    };
  }

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

  const assignedBookingsByStaff = new Map();
  const locksByStaff = new Map();

  for (const staff of staffMembers) {
    assignedBookingsByStaff.set(String(staff._id), []);
    locksByStaff.set(String(staff._id), new Set());
  }

  if (staffMembers.length === 0) {
    return {
      staffMembers,
      unassignedBookings: [],
      assignedBookingsByStaff,
      locksByStaff,
    };
  }

  const bufferMinutes = Number(service.bufferMinutes || 0);

  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) {
    throw new Error("Invalid service buffer.");
  }

  const validSlots = candidateSlots.map((slot) => {
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);

    if (
      !Number.isFinite(startTime.getTime()) ||
      !Number.isFinite(endTime.getTime()) ||
      endTime <= startTime
    ) {
      throw new Error("Invalid candidate appointment time.");
    }

    return { startTime, endTime };
  });

  const maxOccupiedEnd = new Date(
    Math.max(
      ...validSlots.map(
        (slot) =>
          slot.endTime.getTime() + bufferMinutes * 60 * 1000
      )
    )
  );

  const staffIds = staffMembers.map((staff) => staff._id);

  // Fetch assigned and unassigned bookings in one database query.
  const bookingQuery = {
    businessId: business._id,
    status: { $in: ACTIVE_STATUSES },
    bookingDate: { $lt: maxOccupiedEnd },
    $or: [
      { assignedStaffId: null },
      { assignedStaffId: { $in: staffIds } },
    ],
  };

  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId };
  }

  let bookingsQueryBuilder = Booking.find(bookingQuery).populate(
    "serviceId",
    "duration bufferMinutes"
  );

  if (session) {
    bookingsQueryBuilder = bookingsQueryBuilder.session(session);
  }

  const bookings = await bookingsQueryBuilder;

  const unassignedBookings = [];

  for (const booking of bookings) {
    if (!booking.assignedStaffId) {
      unassignedBookings.push(booking);
      continue;
    }

    const staffId = String(
      booking.assignedStaffId._id || booking.assignedStaffId
    );

    if (assignedBookingsByStaff.has(staffId)) {
      assignedBookingsByStaff.get(staffId).push(booking);
    }
  }

  // Collect the required lock minutes across all candidate slots.
  const requiredLockMinutes = new Map();

  for (const slot of validSlots) {
    const lockMinutes = getBookingLockMinutes({
      startTime: slot.startTime,
      endTime: slot.endTime,
      bufferMinutes,
    });

    for (const minute of lockMinutes) {
      const minuteDate = new Date(minute);
      const minuteTime = minuteDate.getTime();

      if (!Number.isFinite(minuteTime)) {
        throw new Error("Invalid booking lock minute.");
      }

      requiredLockMinutes.set(minuteTime, minuteDate);
    }
  }

  if (requiredLockMinutes.size > 0) {
    let locksQueryBuilder = BookingSlotLock.find({
      staffId: { $in: staffIds },
      minuteStart: { $in: Array.from(requiredLockMinutes.values()) },
    });

    if (session) {
      locksQueryBuilder = locksQueryBuilder.session(session);
    }

    const locks = await locksQueryBuilder;

    for (const lock of locks) {
      const staffId = String(lock.staffId);
      const staffLocks = locksByStaff.get(staffId);

      if (staffLocks) {
        const minuteTime = new Date(lock.minuteStart).getTime();

        if (Number.isFinite(minuteTime)) {
          staffLocks.add(minuteTime);
        }
      }
    }
  }

  return {
    staffMembers,
    unassignedBookings,
    assignedBookingsByStaff,
    locksByStaff,
  };
};


/**
 * OPTIMIZED HELPER 2
 *
 * Checks whether at least one staff member can take a candidate slot.
 * Does not perform any MongoDB queries.
 */
export const hasEligibleStaffForSlot = ({
  business,
  service,
  startTime,
  endTime,
  context,
}) => {
  if (!business?._id || !service?._id || !context) {
    return false;
  }

  if (
    requiresExplicitServiceStaff(business) &&
    (!Array.isArray(service.staffIds) || service.staffIds.length === 0)
  ) {
    return false;
  }

  const proposedStart = new Date(startTime);
  const proposedEnd = new Date(endTime);

  if (
    !Number.isFinite(proposedStart.getTime()) ||
    !Number.isFinite(proposedEnd.getTime()) ||
    proposedEnd <= proposedStart
  ) {
    return false;
  }

  const bufferMinutes = Number(service.bufferMinutes || 0);

  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) {
    return false;
  }

  const proposedOccupiedEnd = new Date(
    proposedEnd.getTime() + bufferMinutes * 60 * 1000
  );

  // Unassigned active bookings block every staff member.
  const hasLegacyConflict = context.unassignedBookings.some((booking) => {
    const existingStart = new Date(booking.bookingDate);
    const existingEnd = getExistingBookingEnd(booking);

    if (
      !Number.isFinite(existingStart.getTime()) ||
      !existingEnd
    ) {
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
    return false;
  }

  const lockMinutes = getBookingLockMinutes({
    startTime: proposedStart,
    endTime: proposedEnd,
    bufferMinutes,
  });

  const requiredLockTimes = new Set(
    lockMinutes.map((minute) => new Date(minute).getTime())
  );

  for (const staff of context.staffMembers) {
    const staffId = String(staff._id);

    const workingHoursAvailable = isWithinWorkingHours({
      workingHours: staff.workingHours,
      date: proposedStart,
      endTime: proposedOccupiedEnd,
      fallbackWorkingHours: business.workingHours,
    });

    if (!workingHoursAvailable) {
      continue;
    }

    // Check locks loaded earlier.
    const staffLocks = context.locksByStaff.get(staffId) || new Set();

    const hasLockConflict = Array.from(requiredLockTimes).some(
      (minuteTime) => staffLocks.has(minuteTime)
    );

    if (hasLockConflict) {
      continue;
    }

    // Check assigned bookings loaded earlier.
    const assignedBookings =
      context.assignedBookingsByStaff.get(staffId) || [];

    const hasAssignedConflict = assignedBookings.some((booking) => {
      const existingStart = new Date(booking.bookingDate);
      const existingEnd = getExistingBookingEnd(booking);

      if (
        !Number.isFinite(existingStart.getTime()) ||
        !existingEnd
      ) {
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
      return true;
    }
  }

  return false;
};

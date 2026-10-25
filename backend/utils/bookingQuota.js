const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.map((part) => [part.type, Number(part.value)])
  );
}

// Build an instant corresponding to midnight IST.
function istMidnight(year, month, day) {
  return new Date(
    Date.UTC(year, month - 1, day) - IST_OFFSET_MS
  );
}

// Add calendar months using the original day, clamped to
// the last day of the destination month.
function addMonthsClamped(year, month, day, monthsToAdd) {
  const firstOfTarget = new Date(
    Date.UTC(year, month - 1 + monthsToAdd, 1)
  );

  const targetYear = firstOfTarget.getUTCFullYear();
  const targetMonth = firstOfTarget.getUTCMonth() + 1;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth, 0)
  ).getUTCDate();

  return {
    year: targetYear,
    month: targetMonth,
    day: Math.min(day, lastDay),
  };
}

/**
 * Returns the current booking quota cycle for a business.
 * Cycles follow the original registration day in IST.
 * Historical bookings are never deleted.
 */
export function getBookingQuotaCycle(createdAt, now = new Date()) {
  const registration = getISTParts(new Date(createdAt));
  const current = getISTParts(now);

  const registrationDay = registration.day;

  let anniversary = addMonthsClamped(
    current.year,
    current.month,
    registrationDay,
    0
  );

  let start = istMidnight(
    anniversary.year,
    anniversary.month,
    anniversary.day
  );

  // If this month's anniversary has not arrived,
  // the current cycle began in the previous month.
  if (now < start) {
    anniversary = addMonthsClamped(
      current.year,
      current.month,
      registrationDay,
      -1
    );

    start = istMidnight(
      anniversary.year,
      anniversary.month,
      anniversary.day
    );
  }

  // IMPORTANT: use the original registration day here,
  // not anniversary.day, which may have been clamped.
  const nextAnniversary = addMonthsClamped(
    anniversary.year,
    anniversary.month,
    registrationDay,
    1
  );

  const end = istMidnight(
    nextAnniversary.year,
    nextAnniversary.month,
    nextAnniversary.day
  );

  return { start, end };
}
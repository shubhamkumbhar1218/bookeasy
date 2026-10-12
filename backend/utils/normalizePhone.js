export function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  // India: treat +91XXXXXXXXXX and XXXXXXXXXX as the same number.
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}
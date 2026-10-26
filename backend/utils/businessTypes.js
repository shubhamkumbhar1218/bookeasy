
export const BUSINESS_TYPES = [
  "salon",
  "barber",
  "tutor",
  "gym",
  "repair shop",
  "hospital",
  "dental clinic",
  "doctor / clinic",
  "physiotherapy",
  "spa & wellness",
  "yoga & meditation",
  "pet clinic / veterinary",
  "car & bike service",
  "photography studio",
  "coaching classes",
  "makeup artist",
  "tailor",
  "plumber",
  "electrician",
  "computer repair",
  "consultant",
  "driving school",
  "diagnostic lab",
  "nutritionist / dietitian",
  "laundry & dry cleaning",
  "other",
];

const CATEGORY_ALIASES = {
  "repair": "repair shop",
  "salon & beauty": "salon",
};

export function normalizeBusinessType(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const normalized = CATEGORY_ALIASES[cleaned] || cleaned;

  return BUSINESS_TYPES.includes(normalized)
    ? normalized
    : null;
}

const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    bookingLimit: 30,
    features: [
      "booking_link",
      "basic_bookings",
      "basic_dashboard",
      "basic_notifications",
    ],
  },

  STARTER: {
    name: "Basic",
    price: 199,
    yearlyPrice: 1990,
    bookingLimit: null,
    features: [
      "booking_link",
      "unlimited_bookings",
      "customer_management",
      "reviews",
      "analytics",
      "qr_code",
      "pop-up notifications",
    ],
  },

  BUSINESS: {
    name: "Business",
    price: 499,
    yearlyPrice: 4990,
    bookingLimit: null,
    features: [
      "booking_link",
      "unlimited_bookings",
      "customer_management",
      "reviews",
      "analytics",
      "qr_code",
      "pop-up notifications",
      "staff_management",
      "automated_reminders",
      "advanced_analytics",
      "payment_features",
      "customer_retention",
    ],
  },

  // Keep PRO here for existing accounts if needed,
  // but hide it from the customer-facing plan list.
  PRO: {
    name: "Pro",
    price: 999,
    yearlyPrice: 9990,
    bookingLimit: null,
    features: [
      "booking_link",
      "unlimited_bookings",
      "customer_management",
      "reviews",
      "analytics",
      "qr_code",
      "pop-up notifications",
      "staff_management",
      "whatsapp_automation",
      "automated_reminders",
      "advanced_analytics",
      "payment_features",
      "customer_retention",
      "multiple_branches",
      "advanced_marketing",
      "loyalty_program",
      "advanced_reports",
      "advanced_automation",
    ],
  },
};

export default PLANS;

const PLANS = {
FREE: {
  name: "Free",
  price: 0,
  bookingLimit: 100,
  features: [
    "booking_link",
    "basic_bookings",
    "basic_dashboard",
    "basic_notifications",
  ],
},

  STARTER: {
    name: "Starter",
    price: 199,
    bookingLimit: null,
    features: [
      "booking_link",
      "unlimited_bookings",
      "customer_management",
      "reviews",
      "analytics",
      "qr_code",
    ],
  },

  BUSINESS: {
    name: "Business",
    price: 499,
    bookingLimit: null,
    features: [
      "booking_link",
      "unlimited_bookings",
      "customer_management",
      "reviews",
      "analytics",
      "qr_code",
      "staff_management",
      "whatsapp_automation",
      "automated_reminders",
      "advanced_analytics",
      "payment_features",
      "customer_retention",
    ],
  },

  PRO: {
    name: "Pro",
    price: 999,
    bookingLimit: null,
    features: [
      "booking_link",
      "unlimited_bookings",
      "customer_management",
      "reviews",
      "analytics",
      "qr_code",
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

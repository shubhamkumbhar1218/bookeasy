import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
  type: String,
  enum: ["BUSINESS", "ADMIN"],
  default: "BUSINESS",
},

accountStatus: {
  type: String,
  enum: ["ACTIVE", "SUSPENDED"],
  default: "ACTIVE",
},

isActive: {
  type: Boolean,
  default: true,
},

    resetPasswordToken: {
  type: String,
  default: null,
},

resetPasswordExpires: {
  type: Date,
  default: null,
},

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    profilePhoto: {
  type: String,
  default: "",
},

profilePhotoPublicId: {
  type: String,
  default: "",
},

    businessSlug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },



businessType: {
  type: String,
  enum: [
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
  ],
  default: "other",
},

    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    workingHours: {
  monday: {
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  tuesday: {
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  wednesday: {
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  thursday: {
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  friday: {
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  saturday: {
    open: { type: String, default: "10:00" },
    close: { type: String, default: "16:00" },
    closed: { type: Boolean, default: false },
  },
  sunday: {
    open: { type: String, default: "10:00" },
    close: { type: String, default: "16:00" },
    closed: { type: Boolean, default: true },
  },
},


  // SUBSCRIPTION PLAN
plan: {
  type: String,
  enum: ["FREE", "STARTER", "BUSINESS", "PRO"],
  default: "FREE",
},

// SUBSCRIPTION STATUS
subscriptionStatus: {
  type: String,
  enum: ["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"],
  default: "ACTIVE",
},

// BILLING PERIOD
subscriptionStartDate: {
  type: Date,
  default: null,
},

subscriptionEndDate: {
  type: Date,
  default: null,
},

// PAYMENT PROVIDER REFERENCE
subscriptionPaymentId: {
  type: String,
  default: "",
},

// Cashfree recurring subscription reference
cashfreeSubscriptionId: {
  type: String,
  default: "",
  index: true,
},

// Cashfree's latest subscription status
cashfreeSubscriptionStatus: {
  type: String,
  default: "",
},

// Automatic renewal tracking
subscriptionBillingMode: {
  type: String,
  enum: ["MANUAL", "AUTOMATIC"],
  default: "MANUAL",
},

subscriptionNextBillingDate: {
  type: Date,
  default: null,
},

subscriptionLastPaymentAt: {
  type: Date,
  default: null,
},

subscriptionLastPaymentId: {
  type: String,
  default: "",
},

  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
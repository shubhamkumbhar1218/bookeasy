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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
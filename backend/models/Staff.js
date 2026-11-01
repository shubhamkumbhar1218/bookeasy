
import mongoose from "mongoose";

const staffWorkingHourSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    startTime: {
      type: String,
      default: "09:00",
      trim: true,
    },

    endTime: {
      type: String,
      default: "18:00",
      trim: true,
    },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    // Business that owns this team member.
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 150,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    // An empty schedule means the business schedule
    // can be used as the default in a later stage.
    workingHours: {
      type: [staffWorkingHourSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.index({
  businessId: 1,
  isActive: 1,
});

const Staff = mongoose.model("Staff", staffSchema);

export default Staff;

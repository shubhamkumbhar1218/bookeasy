// import mongoose from "mongoose";

// const reviewSchema = new mongoose.Schema(
//   {
//     businessId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     serviceId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Service",
//       required: true,
//     },

//     bookingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Booking",
//       required: true,
//       unique: true,
//     },

//     customerName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     customerPhone: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     rating: {
//       type: Number,
//       required: true,
//       min: 1,
//       max: 5,
//     },

//     review: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 500,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// export default mongoose.model("Review", reviewSchema);



import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // Business that owns the service
    // --------------------------------------------------

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --------------------------------------------------
    // EXACT service that was booked
    // --------------------------------------------------

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    // --------------------------------------------------
    // One review per booking
    // --------------------------------------------------

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    // --------------------------------------------------
    // Customer information
    // --------------------------------------------------

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    // --------------------------------------------------
    // Rating: 1 - 5
    // --------------------------------------------------

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // --------------------------------------------------
    // Review text
    // --------------------------------------------------

    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);


// ======================================================
// INDEXES
// ======================================================

// Quickly find all reviews belonging to one service.
reviewSchema.index({
  serviceId: 1,
  createdAt: -1,
});


export default mongoose.model(
  "Review",
  reviewSchema
);
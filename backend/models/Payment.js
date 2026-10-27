
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // BookEasy's internal payment reference
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    plan: {
      type: String,
      enum: ["STARTER", "BUSINESS", "PRO"],
      required: true,
    },

    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      required: true,
    },

    // Payment gateway. Existing documents default to Cashfree.
    provider: {
      type: String,
      enum: ["CASHFREE", "RAZORPAY"],
      default: "CASHFREE",
      required: true,
    },

    // Existing Cashfree references
    cfPaymentId: {
      type: String,
      default: "",
    },

    paymentSessionId: {
      type: String,
      default: "",
    },

    // Razorpay references
    razorpayOrderId: {
      type: String,
      default: "",
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
























// import mongoose from "mongoose";

// const paymentSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },

//     orderId: {
//       type: String,
//       required: true,
//       unique: true,
//     },

//     plan: {
//       type: String,
//       enum: ["STARTER", "BUSINESS", "PRO"],
//       required: true,
//     },

//     billingPeriod: {
//   type: String,
//   enum: ["monthly", "yearly"],
//   default: "monthly",
//   required: true,
// },

//     amount: {
//       type: Number,
//       required: true,
//       min: 1,
//     },

//     currency: {
//       type: String,
//       default: "INR",
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["PENDING", "PAID", "FAILED"],
//       default: "PENDING",
//       required: true,
//     },

//     cfPaymentId: {
//       type: String,
//       default: "",
//     },

//     paymentSessionId: {
//       type: String,
//       default: "",
//     },

//     paidAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const Payment = mongoose.model("Payment", paymentSchema);

// export default Payment;

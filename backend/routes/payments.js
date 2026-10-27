import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Razorpay from "razorpay";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { createHmac, timingSafeEqual } from "node:crypto";

const router = express.Router();

const API_VERSION = "2025-01-01";

const PLAN_PRICES = {
  STARTER: { monthly: 299, yearly: 2990 },
  BUSINESS: { monthly: 499, yearly: 4990 },
  PRO: { monthly: 999, yearly: 9990 },
};

function addOneCalendarMonth(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid subscription date.");
  }

  const originalDay = date.getDate();

  // Move to the first day before changing the month,
  // preventing month-end overflow.
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);

  const lastDayOfMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  date.setDate(Math.min(originalDay, lastDayOfMonth));

  return date;
}

function addOneCalendarYear(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid subscription date.");
  }

  const originalMonth = date.getMonth();
  const originalDay = date.getDate();

  date.setDate(1);
  date.setFullYear(date.getFullYear() + 1);
  date.setMonth(originalMonth);

  const lastDayOfMonth = new Date(
    date.getFullYear(),
    originalMonth + 1,
    0
  ).getDate();

  date.setDate(Math.min(originalDay, lastDayOfMonth));

  return date;
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

function getFrontendUrl() {
  const url = process.env.FRONTEND_URL?.trim();

  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error("FRONTEND_URL must be a valid HTTPS URL.");
  }

  return url.replace(/\/+$/, "");
}

function getBackendUrl() {
  const url = process.env.BACKEND_URL?.trim();

  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error("BACKEND_URL must be a valid HTTPS URL.");
  }

  return url.replace(/\/+$/, "");
}

/* Razorpay Test Mode: STARTER monthly and yearly one-time payments */

router.post(
  "/razorpay/create-order",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = getUserId(req);

const { plan, billingPeriod } = req.body;

if (
  plan !== "STARTER" ||
  !["monthly", "yearly"].includes(billingPeriod)
) {
  return res.status(400).json({
    success: false,
    message: "Razorpay checkout supports STARTER monthly and yearly plans only.",
  });
}

// Always determine the amount on the server.
const amount =
  billingPeriod === "monthly" ? 299 : 2990;


      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (
        process.env.RAZORPAY_MODE !== "test" ||
        !keyId?.startsWith("rzp_test_") ||
        !keySecret
      ) {
        return res.status(503).json({
          success: false,
          message: "Razorpay Test Mode is not configured correctly.",
        });
      }

      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

if (!userId || !mongoose.isValidObjectId(userId)) {
  return res.status(401).json({
    success: false,
    message: "Please log in again.",
  });
}

const user = await User.findOne({
  _id: userId,
  role: "BUSINESS",
  accountStatus: "ACTIVE",
  isActive: { $ne: false },
});

if (!user) {
  return res.status(403).json({
    success: false,
    message: "Business account not found or inactive.",
  });
}

const internalOrderId = `be_${randomUUID().replace(/-/g, "")}`;

const payment = await Payment.create({
  userId: user._id,
  orderId: internalOrderId,
  plan: "STARTER",
  billingPeriod,
  amount,
  currency: "INR",
  status: "PENDING",
  provider: "RAZORPAY",
});

      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: amount * 100,
          currency: "INR",
          receipt: internalOrderId,
          notes: {
            bookeasyOrderId: internalOrderId,
            userId: String(userId),
            plan: "STARTER",
            billingPeriod,
          },
        });

        payment.razorpayOrderId = razorpayOrder.id;
        await payment.save();

        return res.status(201).json({
          success: true,
          orderId: internalOrderId,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId,
          plan: "STARTER",
          billingPeriod,
        });
      } catch (gatewayError) {
        payment.status = "FAILED";
        await payment.save();
        throw gatewayError;
      }
    } catch (error) {
      console.error(
        "Razorpay order creation failed:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Could not create the Razorpay order. Please try again.",
      });
    }
  }
);



router.post("/razorpay/verify", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId || !mongoose.isValidObjectId(userId)) {
  return res.status(401).json({
    success: false,
    message: "Please log in again.",
  });
}

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !orderId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment verification details.",
      });
    }

    if (
      process.env.RAZORPAY_MODE !== "test" ||
      !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return res.status(503).json({
        success: false,
        message: "Razorpay Test Mode is not configured.",
      });
    }

    const paymentRecord = await Payment.findOne({
      orderId,
      razorpayOrderId: razorpay_order_id,
      userId,
      provider: "RAZORPAY",
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment order was not found for this account.",
      });
    }

    // A verified payment must never be applied twice.
    if (paymentRecord.status === "PAID") {
      return res.json({
        success: true,
        paid: true,
        plan: paymentRecord.plan,
        billingPeriod: paymentRecord.billingPeriod,
        message: "Payment has already been verified.",
      });
    }

    if (paymentRecord.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "This payment order is no longer pending.",
      });
    }

    const expectedSignature = createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET
    )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay signature verification failed.",
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const [gatewayOrder, gatewayPayment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);

    if (
      gatewayOrder.receipt !== paymentRecord.orderId ||
      gatewayOrder.currency !== paymentRecord.currency ||
      gatewayOrder.amount !== paymentRecord.amount * 100 ||
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.currency !== paymentRecord.currency ||
      gatewayPayment.amount !== paymentRecord.amount * 100 ||
      gatewayPayment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment details do not match this order.",
      });
    }

    if (
      paymentRecord.plan !== "STARTER" ||
      !["monthly", "yearly"].includes(paymentRecord.billingPeriod) ||
      paymentRecord.amount !==
        (paymentRecord.billingPeriod === "monthly" ? 299 : 2990)
    ) {
      return res.status(400).json({
        success: false,
        message: "The saved plan or payment amount is invalid.",
      });
    }


    const session = await mongoose.startSession();
    let activated = false;

    try {
      await session.withTransaction(async () => {
        // Claim the payment once so simultaneous verification requests
        // cannot activate the same payment twice.
        const claimedPayment = await Payment.findOneAndUpdate(
          {
            _id: paymentRecord._id,
            userId,
            provider: "RAZORPAY",
            status: "PENDING",
          },
          {
            $set: {
              status: "PAID",
              razorpayPaymentId: razorpay_payment_id,
              paidAt: new Date(),
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!claimedPayment) {
          throw new Error("PAYMENT_ALREADY_PROCESSED");
        }

        // Calculate the subscription period from the verified payment.
        const billingPeriod = claimedPayment.billingPeriod || "monthly";
        const now = claimedPayment.paidAt || new Date();

        // If the business already has an active paid plan, add the
        // new purchase after its existing expiry rather than losing
        // the remaining paid time.
        const currentUser = await User.findOne({
          _id: userId,
          role: "BUSINESS",
          accountStatus: "ACTIVE",
          isActive: { $ne: false },
        }).session(session);

        if (!currentUser) {
          throw new Error("USER_ACTIVATION_FAILED");
        }

        const existingEnd = currentUser.subscriptionEndDate
          ? new Date(currentUser.subscriptionEndDate)
          : null;

        const hasActivePaidTime =
          currentUser.subscriptionStatus === "ACTIVE" &&
          existingEnd &&
          !Number.isNaN(existingEnd.getTime()) &&
          existingEnd > now;

        const startDate = hasActivePaidTime ? existingEnd : now;

        const endDate =
          billingPeriod === "yearly"
            ? addOneCalendarYear(startDate)
            : addOneCalendarMonth(startDate);

        const updatedUser = await User.findOneAndUpdate(
          {
            _id: userId,
            role: "BUSINESS",
            accountStatus: "ACTIVE",
            isActive: { $ne: false },
          },
          {
            $set: {
              plan: claimedPayment.plan,
              subscriptionStatus: "ACTIVE",
              subscriptionStartDate: startDate,
              subscriptionEndDate: endDate,
              subscriptionPaymentId: claimedPayment.orderId,
              subscriptionBillingMode: "ONE_TIME",
            },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );

        if (!updatedUser) {
          throw new Error("USER_ACTIVATION_FAILED");
        }

        activated = true;
      });
    } finally {
      await session.endSession();
    }


    return res.json({
      success: true,
      paid: true,
      planActivated: activated,
      plan: paymentRecord.plan,
      billingPeriod: paymentRecord.billingPeriod,
      message: "Razorpay payment verified and plan activated.",
    });
  } catch (error) {
    if (error.message === "PAYMENT_ALREADY_PROCESSED") {
      return res.status(409).json({
        success: false,
        message: "This payment has already been processed. Check your subscription status.",
      });
    }

    console.error("Razorpay verification failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify the Razorpay payment.",
    });
  }
});



router.post("/razorpay/status", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "BookEasy order reference is required.",
      });
    }

    const payment = await Payment.findOne({
      orderId,
      userId,
      provider: "RAZORPAY",
    }).select("orderId plan billingPeriod amount currency status paidAt");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found for this account.",
      });
    }

    return res.json({
      success: true,
      paid: payment.status === "PAID",
      paymentStatus: payment.status,
      plan: payment.plan,
      billingPeriod: payment.billingPeriod,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    console.error("Razorpay status check failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not check payment status.",
    });
  }
});



export default router;

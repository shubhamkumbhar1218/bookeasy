import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import Razorpay from "razorpay";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";
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

const isProduction = process.env.CASHFREE_ENV === "PRODUCTION";

const environment = isProduction
  ? CFEnvironment.PRODUCTION
  : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  environment,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET
);

const CASHFREE_API_BASE = isProduction
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

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

function ensureCashfreeCredentials() {
  if (
    !process.env.CASHFREE_CLIENT_ID ||
    !process.env.CASHFREE_CLIENT_SECRET
  ) {
    throw new Error("Cashfree credentials are not configured.");
  }
}

function getSafeErrorMessage(error) {
  return (
    error.details?.message ||
    error.details?.message_text ||
    error.message ||
    "An unexpected payment error occurred."
  );
}

async function cashfreeSubscriptionRequest(path, options = {}) {
  ensureCashfreeCredentials();

  const response = await fetch(`${CASHFREE_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": process.env.CASHFREE_CLIENT_ID,
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.message_text ||
        `Cashfree API failed (${response.status}).`
    );

    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

// ============================================================
// ONE-TIME PAYMENT: CREATE ORDER
// ============================================================

router.post("/create-order", authMiddleware, async (req, res) => {
  let payment;

  try {
    ensureCashfreeCredentials();

    const userId = getUserId(req);
const { plan, billingPeriod = "monthly" } = req.body;

if (!["monthly", "yearly"].includes(billingPeriod)) {
  return res.status(400).json({
    success: false,
    message: "Choose monthly or yearly billing.",
  });
}

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in again.",
      });
    }

    if (!Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid paid plan.",
      });
    }

    const user = await User.findById(userId);

    if (!user || user.role !== "BUSINESS") {
      return res.status(403).json({
        success: false,
        message: "Only business accounts can purchase a plan.",
      });
    }

    if (user.accountStatus !== "ACTIVE" || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    const phone = String(user.phone || "").replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Add a valid 10-digit Indian mobile number first.",
      });
    }

    const frontendUrl = getFrontendUrl();
    const orderId = `be_${randomUUID().replace(/-/g, "")}`;
    const amount = PLAN_PRICES[plan][billingPeriod];

    payment = await Payment.create({
      userId: user._id,
      orderId,
      plan,
      billingPeriod,
      amount,
      currency: "INR",
      status: "PENDING",
    });

    const response = await cashfree.PGCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: String(user._id),
        customer_name: String(
          user.name || user.businessName || "Customer"
        )
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .slice(0, 100) || "Customer",
        customer_email: user.email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `${frontendUrl}/payment/return?order_id={order_id}`,
      },
      order_note: `BookEasy ${plan} ${billingPeriod} plan`,
    });

    const order = response.data;

    if (!order?.payment_session_id) {
      throw new Error("Cashfree did not return a payment session.");
    }

    payment.paymentSessionId = order.payment_session_id;
    await payment.save();

    return res.status(201).json({
      success: true,
      billingMode: "ONE_TIME",
      orderId,
      plan,
      billingPeriod,
      amount,
      currency: "INR",
      paymentSessionId: order.payment_session_id,
      cashfreeMode: isProduction ? "production" : "sandbox",
    });
  } catch (error) {
console.error(
  "Cashfree create-order error:",
  JSON.stringify(
    {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      details: error.response?.data?.message,
      code: error.code,
    },
    null,
    2
  )
);

    if (payment && payment.status === "PENDING") {
      payment.status = "FAILED";
      await payment.save().catch(() => {});
    }

    return res.status(error.status === 401 ? 401 : 500).json({
      success: false,
      message: getSafeErrorMessage(error),
    });
  }
});

// ============================================================
// ONE-TIME PAYMENT: VERIFY ORDER
// ============================================================

router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orderId } = req.body;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in again.",
      });
    }

    if (typeof orderId !== "string" || orderId.length > 50) {
      return res.status(400).json({
        success: false,
        message: "A valid order ID is required.",
      });
    }

    const payment = await Payment.findOne({ orderId, userId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    if (payment.status === "PAID") {
  const activeUser = await User.findOne({
    _id: userId,
    role: "BUSINESS",
    accountStatus: "ACTIVE",
    isActive: { $ne: false },
    plan: payment.plan,
    subscriptionStatus: "ACTIVE",
    subscriptionPaymentId: payment.orderId,
    subscriptionEndDate: { $gt: new Date() },
  }).select("_id");

  if (!activeUser) {
    console.error(
      "Payment is PAID but plan activation is not confirmed:",
      payment.orderId
    );

    return res.status(500).json({
      success: false,
      paid: true,
      planActivated: false,
      activationPending: true,
      message:
        "Payment is recorded, but plan activation could not be confirmed. Please contact support.",
    });
  }

  return res.json({
    success: true,
    paid: true,
    planActivated: true,
    plan: payment.plan,
    billingPeriod: payment.billingPeriod || "monthly",
    message: "Payment verified and your plan is active.",
  });
}

    const response = await cashfree.PGFetchOrder(payment.orderId);

    const order = response.data;

    if (
      order.order_id !== payment.orderId ||
      Number(order.order_amount) !== payment.amount ||
      order.order_currency !== payment.currency
    ) {
      return res.status(400).json({
        success: false,
        paid: false,
        message: "Payment details could not be verified.",
      });
    }

    if (order.order_status !== "PAID") {
      return res.json({
        success: true,
        paid: false,
        paymentStatus: order.order_status,
        message: "Payment has not been confirmed.",
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


    // Atomically mark the payment PAID and activate the business plan.
    // If either database write fails, the transaction rolls back both.
    const session = await mongoose.startSession();

    let activationResult;

    try {
      await session.withTransaction(async () => {
        const claimedPayment = await Payment.findOneAndUpdate(
          {
            _id: payment._id,
            userId,
            status: "PENDING",
          },
          {
            $set: {
              status: "PAID",
              paidAt: new Date(),
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!claimedPayment) {
          // Another request may have processed this order already.
          // Handle that after the transaction.
          throw new Error("PAYMENT_ALREADY_PROCESSED");
        }

        const billingPeriod =
          claimedPayment.billingPeriod || "monthly";

        const now = claimedPayment.paidAt || new Date();

        const endDate =
          billingPeriod === "yearly"
            ? addOneCalendarYear(now)
            : addOneCalendarMonth(now);

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
              subscriptionStartDate: now,
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

        activationResult = {
          plan: claimedPayment.plan,
          billingPeriod,
          subscriptionStartDate: updatedUser.subscriptionStartDate,
          subscriptionEndDate: updatedUser.subscriptionEndDate,
        };
      });

      return res.json({
        success: true,
        paid: true,
        planActivated: true,
        ...activationResult,
        message: "Payment verified and your plan is active.",
      });
    } catch (error) {
if (error.message === "PAYMENT_ALREADY_PROCESSED") {
  const latestPayment = await Payment.findOne({
    _id: payment._id,
    userId,
  });

  const latestUser = await User.findOne({
    _id: userId,
    role: "BUSINESS",
    accountStatus: "ACTIVE",
    isActive: { $ne: false },
  });

  const isActivated =
    latestPayment?.status === "PAID" &&
    latestUser?.plan === latestPayment.plan &&
    latestUser?.subscriptionStatus === "ACTIVE" &&
    latestUser?.subscriptionPaymentId === latestPayment.orderId &&
    latestUser?.subscriptionEndDate &&
    new Date(latestUser.subscriptionEndDate) > new Date();

  if (isActivated) {
    return res.json({
      success: true,
      paid: true,
      plan: latestPayment.plan,
      billingPeriod: latestPayment.billingPeriod || "monthly",
      subscriptionStartDate: latestUser.subscriptionStartDate,
      subscriptionEndDate: latestUser.subscriptionEndDate,
      message: "Payment verified and your plan is active.",
    });
  }

  console.error(
    "Payment is paid but activation needs recovery:",
    latestPayment?.orderId
  );

  return res.status(500).json({
    success: false,
    paid: true,
    activationPending: true,
    message:
      "Payment is recorded, but plan activation needs recovery. Please contact support.",
  });
}


      console.error("Payment activation transaction failed:", error);

      return res.status(500).json({
        success: false,
        message:
          "Payment could not be fully activated. Please retry verification.",
      });
    } finally {
      await session.endSession();
    }

  } catch (error) {
  console.error("[PAYMENT VERIFY ERROR]", {
    message: error?.message,
    code: error?.code,
    status: error?.response?.status,
    data: error?.response?.data,
  });

  return res.status(500).json({
    success: false,
    message: "Could not verify payment. Please try again.",
  });
}
});

// ============================================================
// AUTOMATIC MONTHLY SUBSCRIPTION: CREATE
// ============================================================

router.post("/create-subscription", authMiddleware, async (req, res) => {
  let localSubscription;

  try {
    ensureCashfreeCredentials();

    const userId = getUserId(req);
    const { plan } = req.body;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in again.",
      });
    }

    if (!Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid paid plan.",
      });
    }

    const user = await User.findById(userId);

    if (!user || user.role !== "BUSINESS") {
      return res.status(403).json({
        success: false,
        message: "Only business accounts can subscribe.",
      });
    }

    if (user.accountStatus !== "ACTIVE" || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    const phone = String(user.phone || "").replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Add a valid 10-digit Indian mobile number first.",
      });
    }

    const frontendUrl = getFrontendUrl();
    const backendUrl = getBackendUrl();

    const subscriptionId = `be_sub_${randomUUID().replace(/-/g, "")}`;
    const amount = PLAN_PRICES[plan].monthly;

    localSubscription = await Subscription.create({
      userId: user._id,
      subscriptionId,
      plan,
      amount,
      currency: "INR",
      status: "CREATED",
    });

    const cashfreeSubscription = await cashfreeSubscriptionRequest(
      "/subscriptions",
      {
        method: "POST",
        body: {
          subscription_id: subscriptionId,
          customer_details: {
            customer_name: String(
              user.name || user.businessName || "Customer"
            )
              .replace(/[^a-zA-Z0-9 ]/g, "")
              .slice(0, 100) || "Customer",
            customer_email: user.email,
            customer_phone: phone,
          },
          plan_details: {
            plan_name: `BookEasy ${plan} Monthly`,
            plan_type: "PERIODIC",
            plan_currency: "INR",
            plan_amount: amount,
            plan_max_amount: amount,
            plan_intervals: 1,
            plan_interval_type: "MONTH",
            plan_note: `BookEasy ${plan} monthly subscription`,
          },
          subscription_meta: {
  return_url: `${backendUrl}/api/payments/subscription-return?subscription_id=${encodeURIComponent(
    subscriptionId
  )}`,
},
          subscription_tags: {
            bookeasy_user_id: String(user._id),
            bookeasy_plan: plan,
          },
        },
      }
    );

    if (!cashfreeSubscription.subscription_session_id) {
      throw new Error("Cashfree did not return a subscription session ID.");
    }

    localSubscription.cashfreeSubscriptionId =
      cashfreeSubscription.subscription_id || subscriptionId;
    localSubscription.subscriptionSessionId =
      cashfreeSubscription.subscription_session_id;
    localSubscription.status = "PENDING";

    await localSubscription.save();

    user.cashfreeSubscriptionId =
      localSubscription.cashfreeSubscriptionId;
    user.cashfreeSubscriptionStatus =
      cashfreeSubscription.subscription_status || "PENDING";

    await user.save();

    return res.status(201).json({
      success: true,
      billingMode: "AUTOMATIC",
      subscriptionId,
      plan,
      amount,
      currency: "INR",
      subscriptionSessionId:
        cashfreeSubscription.subscription_session_id,
      cashfreeMode: isProduction ? "production" : "sandbox",
      message: "Complete Cashfree checkout to authorize monthly billing.",
    });
  } catch (error) {
    console.error(
      "Cashfree create-subscription error:",
      getSafeErrorMessage(error)
    );

    if (localSubscription && localSubscription.status === "CREATED") {
      localSubscription.status = "FAILED";
      await localSubscription.save().catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: getSafeErrorMessage(error),
    });
  }
});

// ============================================================
// CASHFREE RETURN URL
// ============================================================


function handleSubscriptionReturn(req, res) {
  try {
    const frontendUrl = getFrontendUrl();

    // Prefer the ID BookEasy placed in the return URL.
    // Fall back to Cashfree's form/query fields if available.
    const subscriptionId =
      req.query?.subscription_id ||
      req.query?.subscriptionId ||
      req.body?.subscription_id ||
      req.body?.subscriptionId ||
      "";

    const target = new URL("/payment/return", frontendUrl);

    target.searchParams.set("billing_mode", "automatic");

    if (
      typeof subscriptionId === "string" &&
      /^[a-zA-Z0-9_-]{1,250}$/.test(subscriptionId)
    ) {
      target.searchParams.set("subscription_id", subscriptionId);
    } else {
      console.warn(
        "Cashfree returned without a valid BookEasy subscription ID."
      );
    }

    console.log("BookEasy subscription return:", {
      hasSubscriptionId:
        typeof subscriptionId === "string" &&
        /^[a-zA-Z0-9_-]{1,250}$/.test(subscriptionId),
    });

    return res.redirect(303, target.toString());
  } catch (error) {
    console.error(
      "Cashfree subscription return error:",
      error.message
    );

    return res.status(500).send(
      "Unable to return to BookEasy. Open BookEasy and check your subscription."
    );
  }
}

router.get("/subscription-return", handleSubscriptionReturn);

router.post(
  "/subscription-return",
  express.urlencoded({ extended: false }),
  handleSubscriptionReturn
);


// ============================================================
// AUTOMATIC MONTHLY SUBSCRIPTION: VERIFY AND ACTIVATE
// ============================================================

router.post("/verify-subscription", authMiddleware, async (req, res) => {
  try {
    ensureCashfreeCredentials();

    const userId = getUserId(req);
    const { subscriptionId } = req.body;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in again.",
      });
    }

    if (
      typeof subscriptionId !== "string" ||
      subscriptionId.length > 250
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid subscription ID is required.",
      });
    }

    // Verify ownership of the local subscription attempt.
    const localSubscription = await Subscription.findOne({
      subscriptionId,
      userId,
    });

    if (!localSubscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found for this account.",
      });
    }

    // Fetch the latest authoritative status from Cashfree.
    const cashfreeSubscription = await cashfreeSubscriptionRequest(
      `/subscriptions/${encodeURIComponent(
        localSubscription.cashfreeSubscriptionId || subscriptionId
      )}`
    );

    const authorizationStatus = String(
      cashfreeSubscription.authorization_details
        ?.authorization_status || "PENDING"
    ).toUpperCase();

    const cashfreeStatus = String(
      cashfreeSubscription.subscription_status || ""
    ).toUpperCase();

    const returnedSubscriptionId =
      cashfreeSubscription.subscription_id;

    if (
      returnedSubscriptionId &&
      returnedSubscriptionId !==
        (localSubscription.cashfreeSubscriptionId || subscriptionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Cashfree subscription ID mismatch.",
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

    console.log("BookEasy subscription verification:", {
      subscriptionId,
      authorizationStatus,
      cashfreeSubscriptionStatus: cashfreeStatus,
      plan: localSubscription.plan,
    });

    // Authorization success can be enough to activate access in this
    // billing model. Do not activate cancelled/expired subscriptions.
    const terminalStatuses = [
      "CANCELLED",
      "CUSTOMER_CANCELLED",
      "EXPIRED",
      "COMPLETED",
      "ON_HOLD",
    ];

    const isAuthorized = authorizationStatus === "ACTIVE";
    const isTerminal = terminalStatuses.includes(cashfreeStatus);

    let planActivated = false;

    if (isAuthorized && !isTerminal) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const latestSubscription = await Subscription.findOne({
            _id: localSubscription._id,
            userId,
          }).session(session);

          if (!latestSubscription) {
            throw new Error("Subscription record no longer exists.");
          }

          const latestUser = await User.findOne({
            _id: userId,
            role: "BUSINESS",
            accountStatus: "ACTIVE",
            isActive: { $ne: false },
          }).session(session);

          if (!latestUser) {
            throw new Error("Business account is not active.");
          }

          latestSubscription.cashfreeSubscriptionId =
            returnedSubscriptionId ||
            localSubscription.cashfreeSubscriptionId ||
            subscriptionId;

          
          
const now = new Date();

// Start the initial plan period only once.
// Repeated verification must not reset the expiry date.
if (!latestSubscription.currentPeriodStart) {
  latestSubscription.currentPeriodStart = now;
}

if (!latestSubscription.currentPeriodEnd) {
  latestSubscription.currentPeriodEnd = addOneCalendarMonth(
    latestSubscription.currentPeriodStart
  );
}

latestSubscription.status = "ACTIVE";
await latestSubscription.save({ session });

latestUser.plan = latestSubscription.plan;
latestUser.subscriptionStatus = "ACTIVE";

if (!latestUser.subscriptionStartDate) {
  latestUser.subscriptionStartDate =
    latestSubscription.currentPeriodStart;
}

if (!latestUser.subscriptionEndDate) {
  latestUser.subscriptionEndDate =
    latestSubscription.currentPeriodEnd;
}

latestUser.subscriptionNextBillingDate =
  latestSubscription.currentPeriodEnd;

          latestUser.cashfreeSubscriptionId =
            latestSubscription.cashfreeSubscriptionId;
          latestUser.cashfreeSubscriptionStatus = cashfreeStatus;
          latestUser.subscriptionBillingMode = "AUTOMATIC";

          // Do not mark a recurring charge as paid here.
          await latestUser.save({ session });
        });

        planActivated = true;
      } finally {
        await session.endSession();
      }
    } else if (
      authorizationStatus === "FAILED" ||
      authorizationStatus === "FAILURE"
    ) {
      localSubscription.status = "FAILED";
      await localSubscription.save();
    } else if (
      cashfreeStatus.includes("CANCEL") ||
      cashfreeStatus === "EXPIRED" ||
      cashfreeStatus === "COMPLETED"
    ) {
      localSubscription.status = cashfreeStatus.includes("CANCEL")
        ? "CANCELLED"
        : "EXPIRED";

      await localSubscription.save();
    } else {
      localSubscription.status = "PENDING";
      await localSubscription.save();
    }

    return res.json({
      success: true,
      subscriptionId,
      plan: localSubscription.plan,
      authorizationStatus,
      cashfreeSubscriptionStatus: cashfreeStatus,
      subscriptionStatus: planActivated
        ? "ACTIVE"
        : localSubscription.status,
      planActivated,
      message: planActivated
        ? `${localSubscription.plan} plan activated after mandate authorization. The recurring charge has not been confirmed by this check.`
        : "Subscription authorization is not confirmed as active. Check again shortly.",
    });
  } catch (error) {
    console.error(
      "Cashfree subscription verification error:",
      error.details || error.message
    );

    return res.status(500).json({
      success: false,
      message: getSafeErrorMessage(error),
    });
  }
});

// ============================================================
// CASHFREE WEBHOOK — IDEMPOTENT, TRANSACTIONAL PROCESSING
// ============================================================

router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  // 1. Verify the exact raw request body before trusting the event.
  if (
    typeof signature !== "string" ||
    typeof timestamp !== "string" ||
    typeof req.rawBody !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing webhook signature information.",
    });
  }

  let event;

  try {
    const verified = cashfree.PGVerifyWebhookSignature(
      signature,
      req.rawBody,
      timestamp
    );

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    event = JSON.parse(req.rawBody);
  } catch (error) {
    console.error("Cashfree webhook verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Webhook verification failed.",
    });
  }

  try {
    const eventType = String(event.type || "").toUpperCase();
    const data = event.data || {};

    if (
      ![
        "SUBSCRIPTION_PAYMENT_SUCCESS",
        "SUBSCRIPTION_PAYMENT_FAILED",
      ].includes(eventType)
    ) {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    // 2. Extract identifiers from supported payload locations.
    const subscriptionId =
      data.subscription_details?.subscription_id ||
      data.subscription?.subscription_id ||
      data.subscription_id ||
      data.subscription_details?.subscriptionId;

    const paymentDetails =
      data.payment_details ||
      data.payment ||
      data.subscription_payment ||
      {};

    const paymentId = String(
      paymentDetails.cf_payment_id ||
      paymentDetails.payment_id ||
      paymentDetails.paymentId ||
      data.cf_payment_id ||
      data.payment_id ||
      ""
    );

    if (
      typeof subscriptionId !== "string" ||
      !subscriptionId ||
      !paymentId ||
      paymentId.length > 200
    ) {
      console.error("Cashfree webhook identifiers missing", {
        eventType,
        hasSubscriptionId: Boolean(subscriptionId),
        hasPaymentId: Boolean(paymentId),
      });

      return res.status(400).json({
        success: false,
        message: "Subscription or payment identifier is missing.",
      });
    }

    const localSubscription = await Subscription.findOne({
      $or: [
        { subscriptionId },
        { cashfreeSubscriptionId: subscriptionId },
      ],
    });

    if (!localSubscription) {
      // Do not silently acknowledge an unknown payment subscription:
      // investigate configuration/mapping errors in Cashfree's logs.
      console.error("Unknown Cashfree subscription:", subscriptionId);

      return res.status(400).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    // 3. Validate payment status, amount and currency.
    const paymentStatus = String(
      paymentDetails.payment_status ||
      paymentDetails.status ||
      data.payment_status ||
      ""
    ).toUpperCase();

    if (eventType === "SUBSCRIPTION_PAYMENT_SUCCESS") {
      if (!["SUCCESS", "PAID", "COMPLETED"].includes(paymentStatus)) {
        console.error("Success event has unconfirmed payment status", {
          subscriptionId,
          paymentId,
          paymentStatus: paymentStatus || "MISSING",
        });

        return res.status(400).json({
          success: false,
          message: "Successful payment status is not confirmed.",
        });
      }

      const amountValue =
        paymentDetails.payment_amount ??
        paymentDetails.amount ??
        data.payment_amount ??
        data.amount;

      if (
        amountValue == null ||
        !Number.isFinite(Number(amountValue)) ||
        Number(amountValue) !== Number(localSubscription.amount)
      ) {
        console.error("Cashfree payment amount missing or mismatched", {
          subscriptionId,
          paymentId,
        });

        return res.status(400).json({
          success: false,
          message: "Payment amount could not be verified.",
        });
      }

      const currency = String(
        paymentDetails.payment_currency ||
        paymentDetails.currency ||
        data.payment_currency ||
        data.currency ||
        "INR"
      ).toUpperCase();

      if (currency !== localSubscription.currency) {
        return res.status(400).json({
          success: false,
          message: "Payment currency mismatch.",
        });
      }
    }

    // Use Cashfree's payment timestamp where provided.
    // Fall back to receipt time only when the event has no timestamp.
    const rawPaymentTime =
      paymentDetails.payment_time ||
      paymentDetails.payment_completion_time ||
      data.payment_time ||
      event.event_time;

    const parsedPaymentTime = rawPaymentTime
      ? new Date(rawPaymentTime)
      : new Date();

    if (Number.isNaN(parsedPaymentTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment timestamp.",
      });
    }

    const paidAt = parsedPaymentTime;

    // 4. Failed payments must never be recorded as paid.
    // Preserve existing paid-through access until its period ends.
    if (eventType === "SUBSCRIPTION_PAYMENT_FAILED") {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const subscription = await Subscription.findById(
            localSubscription._id
          ).session(session);

          if (!subscription) {
            throw new Error("Subscription no longer exists.");
          }

          const now = new Date();
          const paidThrough =
            subscription.currentPeriodEnd &&
            new Date(subscription.currentPeriodEnd);

          if (!paidThrough || paidThrough <= now) {
            subscription.status = "PAST_DUE";
            await subscription.save({ session });

            await User.updateOne(
              { _id: subscription.userId },
              {
                $set: {
                  subscriptionStatus: "PAST_DUE",
                  cashfreeSubscriptionStatus: "PAST_DUE",
                },
              },
              { session }
            );
          }

          // A failed renewal does not move currentPeriodEnd.
        });
      } finally {
        await session.endSession();
      }

      console.warn("BookEasy recurring payment failed", {
        subscriptionId,
        paymentId,
      });

      return res.status(200).json({ success: true });
    }

    // 5. Process payment and entitlement changes atomically.
    // If any database write fails, MongoDB rolls back the transaction.
    const recurringOrderId = `be_subpay_${paymentId}`;
    const session = await mongoose.startSession();

    let result = { duplicate: false };

    try {
      await session.withTransaction(async () => {
        const existingPayment = await Payment.findOne({
          orderId: recurringOrderId,
        }).session(session);

        if (existingPayment) {
          // A payment record from an earlier version may exist without
          // its subscription update. Do not blindly extend it again.
          result = { duplicate: true };
          return;
        }

        const subscription = await Subscription.findById(
          localSubscription._id
        ).session(session);

        if (!subscription) {
          throw new Error("Subscription no longer exists.");
        }

        const user = await User.findById(
          subscription.userId
        ).session(session);

        if (!user) {
          throw new Error("Subscription owner no longer exists.");
        }

        // Record the successful payment inside the same transaction.
        await Payment.create(
          [
            {
              userId: subscription.userId,
              orderId: recurringOrderId,
              plan: subscription.plan,
              amount: subscription.amount,
              currency: subscription.currency || "INR",
              status: "PAID",
              cfPaymentId: paymentId,
              paidAt,
            },
          ],
          { session }
        );

        const hadPreviousSuccessfulPayment =
          Boolean(subscription.lastPaymentId);

        if (!subscription.currentPeriodStart) {
          subscription.currentPeriodStart = paidAt;
        }

        if (!subscription.currentPeriodEnd) {
          subscription.currentPeriodEnd = addOneCalendarMonth(
            subscription.currentPeriodStart
          );
        } else if (
          hadPreviousSuccessfulPayment ||
          paidAt >= subscription.currentPeriodEnd
        ) {
          // Extend once for a new successful renewal.
          subscription.currentPeriodStart =
            subscription.currentPeriodEnd;

          subscription.currentPeriodEnd = addOneCalendarMonth(
            subscription.currentPeriodEnd
          );
        }

        subscription.lastPaymentId = paymentId;
        subscription.lastPaymentAt = paidAt;
        subscription.status = "ACTIVE";

        await subscription.save({ session });

        user.plan = subscription.plan;
        user.subscriptionStatus = "ACTIVE";
        user.subscriptionStartDate =
          user.subscriptionStartDate ||
          subscription.currentPeriodStart;
        user.subscriptionEndDate = subscription.currentPeriodEnd;
        user.subscriptionPaymentId = recurringOrderId;
        user.cashfreeSubscriptionId =
          subscription.cashfreeSubscriptionId;
        user.cashfreeSubscriptionStatus = "ACTIVE";
        user.subscriptionBillingMode = "AUTOMATIC";
        user.subscriptionLastPaymentAt = paidAt;
        user.subscriptionLastPaymentId = paymentId;
        user.subscriptionNextBillingDate =
          subscription.currentPeriodEnd;

        await user.save({ session });

        result = {
          duplicate: false,
          plan: subscription.plan,
          subscriptionEndDate: subscription.currentPeriodEnd,
        };
      });
    } catch (error) {
      // Concurrent deliveries may race on Payment.orderId's unique index.
      if (error.code === 11000) {
        return res.status(200).json({
          success: true,
          duplicate: true,
        });
      }

      throw error;
    } finally {
      await session.endSession();
    }

    if (result.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
      });
    }

    console.log("BookEasy subscription payment processed", {
      subscriptionId,
      paymentId,
      plan: result.plan,
      subscriptionEndDate: result.subscriptionEndDate,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(
      "Cashfree subscription webhook processing failed:",
      error.message
    );

    // Non-2xx tells Cashfree that processing failed, allowing its
    // configured retry policy to retry the delivery.
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
});




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
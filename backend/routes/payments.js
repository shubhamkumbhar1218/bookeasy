
import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { Cashfree, CFEnvironment } from "cashfree-pg";

import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";

const router = express.Router();

const API_VERSION = "2025-01-01";

const PLAN_PRICES = {
  STARTER: 199,
  BUSINESS: 499,
  PRO: 999,
};

const environment =
  process.env.CASHFREE_ENV === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  environment,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET
);

const CASHFREE_API_BASE =
  process.env.CASHFREE_ENV === "PRODUCTION"
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
    ...(options.body
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      responseData.message ||
        responseData.message_text ||
        `Cashfree subscription API failed (${response.status}).`
    );

    error.status = response.status;
    error.details = responseData;
    throw error;
  }

  return responseData;
}

// ============================================================
// EXISTING ONE-TIME PAYMENT FLOW
// ============================================================

// Create a one-time Cashfree checkout order.
router.post("/create-order", authMiddleware, async (req, res) => {
  let payment;

  try {
    ensureCashfreeCredentials();

    const userId = getUserId(req);

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in again.",
      });
    }

    const { plan } = req.body;

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
        message:
          "Add a valid 10-digit Indian mobile number to your business profile before paying.",
      });
    }

    const frontendUrl = getFrontendUrl();
    const orderId = `be_${randomUUID().replace(/-/g, "")}`;
    const amount = PLAN_PRICES[plan];

    payment = await Payment.create({
      userId: user._id,
      orderId,
      plan,
      amount,
      currency: "INR",
      status: "PENDING",
    });

    const orderRequest = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: String(user._id),
        customer_name:
          String(user.name || user.businessName || "Customer")
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .slice(0, 100) || "Customer",
        customer_email: user.email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `${frontendUrl}/payment/return?order_id={order_id}`,
      },
      order_note: `BookEasy ${plan} plan`,
    };

    const response = await cashfree.PGCreateOrder(
      API_VERSION,
      orderRequest
    );

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
      amount,
      currency: "INR",
      paymentSessionId: order.payment_session_id,
      cashfreeMode:
        environment === CFEnvironment.PRODUCTION
          ? "production"
          : "sandbox",
    });
  } catch (error) {
    console.error(
      "Cashfree create-order error:",
      error.details || error.response?.data || error.message
    );

    if (payment && payment.status === "PENDING") {
      payment.status = "FAILED";
      await payment.save().catch((saveError) => {
        console.error("Could not update failed payment:", saveError.message);
      });
    }

    return res.status(error.status === 401 ? 401 : 500).json({
      success: false,
      message:
        error.details?.message ||
        error.response?.data?.message ||
        "Could not create the payment order. Please try again.",
    });
  }
});

// Verify a one-time payment with Cashfree.
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
      return res.json({
        success: true,
        paid: true,
        plan: payment.plan,
        message: "This payment has already been applied.",
      });
    }

    const response = await cashfree.PGFetchOrder(
      API_VERSION,
      payment.orderId
    );

    const order = response.data;

    const correctAmount =
      Number(order.order_amount) === payment.amount;
    const correctCurrency =
      order.order_currency === payment.currency;
    const correctOrderId = order.order_id === payment.orderId;

    if (!correctAmount || !correctCurrency || !correctOrderId) {
      return res.status(400).json({
        success: false,
        paid: false,
        message: "The payment details could not be verified.",
      });
    }

    if (order.order_status !== "PAID") {
      return res.json({
        success: true,
        paid: false,
        paymentStatus: order.order_status,
        message: "Payment is not confirmed yet.",
      });
    }

    const user = await User.findById(userId);

    if (!user || user.role !== "BUSINESS") {
      return res.status(403).json({
        success: false,
        message: "Business account not found.",
      });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    // Claim this payment once, to avoid duplicate activation.
    const claimedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: "PENDING" },
      {
        $set: {
          status: "PAID",
          paidAt: now,
        },
      },
      { new: true }
    );

    if (!claimedPayment) {
      const latestPayment = await Payment.findById(payment._id);

      if (latestPayment?.status === "PAID") {
        return res.json({
          success: true,
          paid: true,
          plan: latestPayment.plan,
          message: "This payment has already been processed.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Payment is being processed. Please check again shortly.",
      });
    }

    user.plan = claimedPayment.plan;
    user.subscriptionStatus = "ACTIVE";
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = endDate;
    user.subscriptionPaymentId = claimedPayment.orderId;

    await user.save();

    return res.json({
      success: true,
      paid: true,
      plan: claimedPayment.plan,
      subscriptionEndDate: user.subscriptionEndDate,
      message: "Payment verified and your plan is now active.",
    });
  } catch (error) {
    console.error(
      "Cashfree payment verification error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not verify payment right now. Please try again.",
    });
  }
});

// ============================================================
// AUTOMATIC MONTHLY SUBSCRIPTION FLOW
// ============================================================

// Create a Cashfree periodic subscription and return its session ID.
// The customer must complete Cashfree's hosted subscription checkout.
router.post(
  "/create-subscription",
  authMiddleware,
  async (req, res) => {
    let localSubscription;

    try {
      ensureCashfreeCredentials();

      const userId = getUserId(req);

      if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({
          success: false,
          message: "Please log in again.",
        });
      }

      const { plan } = req.body;

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
          message:
            "Add a valid 10-digit Indian mobile number to your business profile before subscribing.",
        });
      }

      const frontendUrl = getFrontendUrl();
      const backendUrl = getBackendUrl();

      const subscriptionId =
        `be_sub_${randomUUID().replace(/-/g, "")}`;
      const amount = PLAN_PRICES[plan];

      // Store the pending attempt before contacting Cashfree.
      localSubscription = await Subscription.create({
        userId: user._id,
        subscriptionId,
        plan,
        amount,
        currency: "INR",
        status: "CREATED",
      });

      const requestBody = {
        subscription_id: subscriptionId,
        customer_details: {
          customer_name:
            String(user.name || user.businessName || "Customer")
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
          // Cashfree returns to this server endpoint using form POST.
          return_url: `${backendUrl}/api/payments/subscription-return`,
        },
        subscription_tags: {
          bookeasy_user_id: String(user._id),
          bookeasy_plan: plan,
        },
      };

      const cashfreeSubscription =
        await cashfreeSubscriptionRequest("/subscriptions", {
          method: "POST",
          body: requestBody,
        });

      if (!cashfreeSubscription.subscription_session_id) {
        throw new Error(
          "Cashfree did not return a subscription session ID."
        );
      }

      localSubscription.cashfreeSubscriptionId =
        cashfreeSubscription.subscription_id || subscriptionId;
      localSubscription.subscriptionSessionId =
        cashfreeSubscription.subscription_session_id;
      localSubscription.status = "PENDING";

      await localSubscription.save();

      // Do not activate the paid plan here.
      // Mandate authorization/payment must be confirmed first.
      user.cashfreeSubscriptionId =
        localSubscription.cashfreeSubscriptionId;
      user.cashfreeSubscriptionStatus =
        cashfreeSubscription.subscription_status || "PENDING";
      user.subscriptionBillingMode = "AUTOMATIC";
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
        cashfreeMode:
          process.env.CASHFREE_ENV === "PRODUCTION"
            ? "production"
            : "sandbox",
        message:
          "Subscription created. Complete Cashfree checkout to authorize monthly billing.",
      });
    } catch (error) {
      console.error(
        "Cashfree create-subscription error:",
        error.details || error.message
      );

      if (localSubscription && localSubscription.status === "CREATED") {
        localSubscription.status = "FAILED";
        await localSubscription.save().catch((saveError) => {
          console.error(
            "Could not update failed subscription:",
            saveError.message
          );
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.details?.message ||
          error.message ||
          "Could not create the monthly subscription. Please try again.",
      });
    }
  }
);

// // Cashfree posts form data to the return URL.
// // Redirect the browser back to the frontend; status must still be verified.
// router.post(
//   "/subscription-return",
//   express.urlencoded({ extended: false }),
//   (req, res) => {
//     try {
//       const frontendUrl = getFrontendUrl();

//       const subscriptionId =
//         req.body?.subscription_id ||
//         req.body?.subscriptionId ||
//         "";

//       const target = new URL(`${frontendUrl}/payment/return`);

//       if (
//         typeof subscriptionId === "string" &&
//         /^[a-zA-Z0-9_. -]{1,250}$/.test(subscriptionId)
//       ) {
//         target.searchParams.set("subscription_id", subscriptionId);
//       }

//       target.searchParams.set("billing_mode", "automatic");

//       return res.redirect(303, target.toString());
//     } catch (error) {
//       console.error("Cashfree subscription return error:", error.message);

//       return res.status(500).send(
//         "Unable to return to BookEasy. Please open BookEasy and check your subscription status."
//       );
//     }
//   }
// );



/* Handle Cashfree's browser return using GET and POST. */
const handleSubscriptionReturn = (req, res) => {
  try {
    const frontendUrl = getFrontendUrl();

    const subscriptionId =
      req.body?.subscription_id ||
      req.body?.subscriptionId ||
      req.query?.subscription_id ||
      req.query?.subscriptionId ||
      "";

    const target = new URL(`${frontendUrl}/payment/return`);

    if (
      typeof subscriptionId === "string" &&
      /^[a-zA-Z0-9_. -]{1,250}$/.test(subscriptionId)
    ) {
      target.searchParams.set("subscription_id", subscriptionId);
    }

    target.searchParams.set("billing_mode", "automatic");

    return res.redirect(303, target.toString());
  } catch (error) {
    console.error(
      "Cashfree subscription return error:",
      error.message
    );

    return res.status(500).send(
      "Unable to return to BookEasy. Please open BookEasy and check your subscription status."
    );
  }
};

router.get("/subscription-return", handleSubscriptionReturn);

router.post(
  "/subscription-return",
  express.urlencoded({ extended: false }),
  handleSubscriptionReturn
);



// Fetch subscription status directly from Cashfree.
// This endpoint checks authorization status but does not by itself
// prove that a monthly charge has succeeded.
router.post(
  "/verify-subscription",
  authMiddleware,
  async (req, res) => {
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

      const localSubscription = await Subscription.findOne({
        subscriptionId,
        userId,
      });

      if (!localSubscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found.",
        });
      }

      const cashfreeSubscription = await cashfreeSubscriptionRequest(
        `/subscriptions/${encodeURIComponent(subscriptionId)}`
      );

      const authorizationStatus =
        cashfreeSubscription.authorization_details
          ?.authorization_status || "PENDING";

      const cashfreeStatus =
        cashfreeSubscription.subscription_status || "";

      localSubscription.cashfreeSubscriptionId =
        cashfreeSubscription.subscription_id || subscriptionId;

      if (authorizationStatus === "ACTIVE") {
        localSubscription.status = "ACTIVE";
      } else if (
        authorizationStatus === "FAILURE" ||
        authorizationStatus === "FAILED"
      ) {
        localSubscription.status = "FAILED";
      } else if (
        /CANCEL/i.test(cashfreeStatus)
      ) {
        localSubscription.status = "CANCELLED";
      } else if (
        /EXPIRE|COMPLETED/i.test(cashfreeStatus)
      ) {
        localSubscription.status = "EXPIRED";
      } else {
        localSubscription.status = "PENDING";
      }

      await localSubscription.save();

      const user = await User.findById(userId);

      if (user) {
        user.cashfreeSubscriptionId =
          localSubscription.cashfreeSubscriptionId;
        user.cashfreeSubscriptionStatus =
          cashfreeStatus || authorizationStatus;
        user.subscriptionBillingMode = "AUTOMATIC";
        await user.save();
      }

      return res.json({
        success: true,
        subscriptionId,
        plan: localSubscription.plan,
        subscriptionStatus: localSubscription.status,
        authorizationStatus,
        cashfreeSubscriptionStatus: cashfreeStatus,
        planActivated: false,
        message:
          authorizationStatus === "ACTIVE"
            ? "Recurring authorization is active. A confirmed payment is still required before activating paid access."
            : "Subscription status retrieved. Complete or check authorization in Cashfree.",
      });
    } catch (error) {
      console.error(
        "Cashfree subscription verification error:",
        error.details || error.message
      );

      return res.status(500).json({
        success: false,
        message:
          error.details?.message ||
          "Could not verify the subscription right now. Please try again.",
      });
    }
  }
);



router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

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

    const event = JSON.parse(req.rawBody);

    // Temporary diagnostic only.
    // Do not activate plans until payment-event handling is implemented.
    console.log("Verified Cashfree webhook:", {
      type: event.type,
      eventTime: event.event_time,
      data: event.data,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(
      "Cashfree webhook verification failed:",
      error.message
    );

    return res.status(400).json({
      success: false,
      message: "Webhook verification failed.",
    });
  }
});


export default router;

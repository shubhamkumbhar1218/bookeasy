import express from "express";
import PushToken from "../models/PushToken.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { normalizePhone } from "../utils/normalizePhone.js";
import { Expo } from "expo-server-sdk";

const router = express.Router();

// =====================================================
// BUSINESS OWNER PUSH TOKEN REGISTRATION
// POST /register
// =====================================================

router.post("/register", authMiddleware, async (req, res) => {
  try {
    const { expoPushToken, platform } = req.body;
    const businessId = req.user.id;

    if (!expoPushToken) {
      return res.status(400).json({
        message: "Expo push token is required",
      });
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({
        message: "Invalid Expo push token",
      });
    }

    if (!businessId) {
      return res.status(401).json({
        message: "Business authentication required",
      });
    }

    // Remove older tokens registered for this business.
    // Keep customer tokens untouched.
    await PushToken.deleteMany({ businessId });

    // Register the owner's device against the business ID.
    const tokenRecord = await PushToken.findOneAndUpdate(
      {
        expoPushToken,
        businessId,
        customerPhone: "",
      },
      {
        $set: {
          expoPushToken,
          businessId,
          customerPhone: "",
          platform: platform || "unknown",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("BOOKEASY: BUSINESS TOKEN REGISTERED", {
      businessId: businessId.toString(),
      tokenId: tokenRecord._id.toString(),
      tokenPrefix: expoPushToken.slice(0, 25),
    });

    return res.status(200).json({
      message: "Business push token registered",
    });
  } catch (error) {
    console.error("Business push token error:", error);

    return res.status(500).json({
      message: "Could not register business push token",
    });
  }
});

// =====================================================
// CUSTOMER PUSH TOKEN REGISTRATION
// POST /customer
// =====================================================

router.post("/customer", async (req, res) => {
  try {
    const { expoPushToken, customerPhone, platform } = req.body;

    if (!expoPushToken || !customerPhone) {
      return res.status(400).json({
        message: "Expo push token and customer phone are required",
      });
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({
        message: "Invalid Expo push token",
      });
    }

    const normalizedPhone = normalizePhone(customerPhone);

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        message: "Enter a valid Indian mobile number",
      });
    }

    const tokenRecord = await PushToken.findOneAndUpdate(
      {
        expoPushToken,
        businessId: null,
        customerPhone: normalizedPhone,
      },
      {
        $set: {
          expoPushToken,
          businessId: null,
          customerPhone: normalizedPhone,
          platform: platform || "unknown",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("BOOKEASY: CUSTOMER TOKEN REGISTERED", {
      customerPhone: normalizedPhone,
      tokenId: tokenRecord._id.toString(),
      tokenPrefix: expoPushToken.slice(0, 25),
    });

    return res.status(200).json({
      message: "Customer push token registered",
    });
  } catch (error) {
    console.error("BookEasy customer push registration error:", error);

    return res.status(500).json({
      message: "Could not register customer push token",
    });
  }
});

// =====================================================
// TEST PUSH NOTIFICATION
// POST /test
// =====================================================

router.post("/test", authMiddleware, async (req, res) => {
  try {
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({
        message: "Expo push token is required",
      });
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({
        message: "Invalid Expo push token",
      });
    }

    const expo = new Expo();

    const tickets = await expo.sendPushNotificationsAsync([
      {
        to: expoPushToken,
        title: "🔔 BookEasy Test",
        body: "Your BookEasy push notification is working!",
        priority: "high",
        channelId: "bookeasy",
        data: {
          type: "test",
          screen: "/",
        },
      },
    ]);

    console.log("BOOKEASY TEST PUSH:", JSON.stringify(tickets, null, 2));

    return res.status(200).json({
      message: "Test push request processed",
      tickets,
    });
  } catch (error) {
    console.error("BOOKEASY TEST PUSH ERROR:", error);

    return res.status(500).json({
      message: "Failed to send test push",
    });
  }
});

export default router;

import express from "express";
import PushToken from "../models/PushToken.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// BUSINESS OWNER PUSH TOKEN
// =====================================================

router.post(
  "/register",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        expoPushToken,
        platform,
      } = req.body;

      if (!expoPushToken) {
        return res.status(400).json({
          message:
            "Expo push token is required",
        });
      }

      await PushToken.findOneAndUpdate(
        {
          expoPushToken,
        },
        {
          expoPushToken,
          businessId: req.user.id,
          customerPhone: "",
          platform:
            platform || "unknown",
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      res.json({
        message:
          "Business push token registered",
      });
    } catch (error) {
      console.log(
        "Business push token error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// CUSTOMER PUSH TOKEN
// =====================================================

router.post(
  "/customer",
  async (req, res) => {
    try {
      const {
        expoPushToken,
        customerPhone,
        platform,
      } = req.body;

      if (
        !expoPushToken ||
        !customerPhone
      ) {
        return res.status(400).json({
          message:
            "Expo push token and customer phone are required",
        });
      }

      await PushToken.findOneAndUpdate(
        {
          expoPushToken,
        },
        {
          expoPushToken,
          businessId: null,
          customerPhone:
            customerPhone.trim(),
          platform:
            platform || "unknown",
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      res.json({
        message:
          "Customer push token registered",
      });
    } catch (error) {
      console.log(
        "Customer push token error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);



// =====================================================
// TEST PUSH NOTIFICATION
// TEMPORARY TEST ENDPOINT
// =====================================================

router.post(
  "/test",
  authMiddleware,
  async (req, res) => {
    try {
      const { expoPushToken } = req.body;

      if (!expoPushToken) {
        return res.status(400).json({
          message:
            "Expo push token is required",
        });
      }

      const { Expo } =
        await import("expo-server-sdk");

      const expo = new Expo();

      if (
        !Expo.isExpoPushToken(
          expoPushToken
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid Expo push token",
        });
      }

      const message = {
        to: expoPushToken,

        title: "🔔 BookEasy Test",

        body:
          "Your BookEasy push notification is working!",

        priority: "high",

        channelId: "bookeasy",

        data: {
          type: "test",
          screen: "/",
        },
      };

      const tickets =
        await expo.sendPushNotificationsAsync([
          message,
        ]);

      console.log(
        "BOOKEASY TEST PUSH:",
        JSON.stringify(
          tickets,
          null,
          2
        )
      );

      res.json({
        message:
          "Test push sent successfully",
        tickets,
      });
    } catch (error) {
      console.log(
        "BOOKEASY TEST PUSH ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to send test push",
        error:
          error.message,
      });
    }
  }
);
export default router;
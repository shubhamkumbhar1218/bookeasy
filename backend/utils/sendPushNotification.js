import { Expo } from "expo-server-sdk";
import PushToken from "../models/PushToken.js";
import { normalizePhone } from "./normalizePhone.js";

const expo = new Expo();

export async function sendPushForNotification(notification) {
  try {
    if (!notification) {
      console.error("BOOKEASY: Notification data is missing.");
      return false;
    }

    let pushTokens = [];
    let recipientType = "";

    // =====================================================
    // 1. FIND THE CORRECT RECIPIENT
    // =====================================================

    // Customer notifications must target only devices
    // registered to the customer's appointment phone number.
    if (notification.customerPhone) {
      const customerPhone = normalizePhone(
        notification.customerPhone
      );

      if (!/^\d{10}$/.test(customerPhone)) {
        console.error(
          "BOOKEASY: Invalid customer phone for push notification.",
          {
            notificationId: notification._id?.toString(),
            type: notification.type,
          }
        );
        return false;
      }

      recipientType = "customer";

      console.log("BOOKEASY: Looking up customer push token.", {
        notificationId: notification._id?.toString(),
        customerPhone,
        type: notification.type,
      });

      pushTokens = await PushToken.find({
        customerPhone,
        businessId: null,
      });
    } else if (notification.businessId) {
      // Business-owner notifications must target only
      // the owner device registered for this business.
      recipientType = "business";

      console.log("BOOKEASY: Looking up business push token.", {
        notificationId: notification._id?.toString(),
        businessId: notification.businessId.toString(),
        type: notification.type,
      });

      pushTokens = await PushToken.find({
        businessId: notification.businessId,
        customerPhone: "",
      });
    } else {
      console.warn(
        "BOOKEASY: No recipient identified for push notification.",
        {
          notificationId: notification._id?.toString(),
          type: notification.type,
        }
      );
      return;
    }

    // =====================================================
    // 2. CHECK WHETHER TOKENS EXIST
    // =====================================================

    if (!pushTokens.length) {
      console.warn("BOOKEASY: No push token found.", {
        notificationId: notification._id?.toString(),
        recipientType,
        businessId: notification.businessId?.toString() || null,
        customerPhone: notification.customerPhone
          ? normalizePhone(notification.customerPhone)
          : null,
        type: notification.type,
      });
      return false;
    }

    console.log("BOOKEASY: Push tokens found.", {
      count: pushTokens.length,
      recipientType,
      type: notification.type,
    });

    // =====================================================
    // 3. BUILD PUSH MESSAGES
    // =====================================================

const messages = [];
let allPushesAccepted = true;

for (const tokenRecord of pushTokens) {
      const token = tokenRecord.expoPushToken;

if (!Expo.isExpoPushToken(token)) {
  allPushesAccepted = false;

  console.error(
    "BOOKEASY: Invalid Expo push token found.",
    {
      tokenId: tokenRecord._id.toString(),
      recipientType,
    }
  );

  continue;
}

      messages.push({
        to: token,
        title: notification.title || "BookEasy",
        body: notification.message || "You have a new notification.",
        sound: "default",
        priority: "high",
        channelId: "bookeasy",
        data: {
          notificationId: notification._id?.toString() || null,
          bookingId: notification.bookingId
            ? notification.bookingId.toString()
            : null,
          type: notification.type || "general",
          screen:
            recipientType === "business"
              ? "/business"
              : "/customer",
        },
      });
    }

    if (!messages.length) {
      console.error(
        "BOOKEASY: No valid push messages to send.",
        { recipientType, type: notification.type }
      );
      return false;
    }

    // =====================================================
    // 4. SEND PUSH NOTIFICATIONS THROUGH EXPO
    // =====================================================

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

if (tickets.some((ticket) => ticket.status !== "ok")) {
  allPushesAccepted = false;

  console.error(
    "BOOKEASY: One or more Expo push tickets failed.",
    {
      type: notification.type,
    }
  );
}

        console.log("BOOKEASY: Expo push tickets.", {
          recipientType,
          type: notification.type,
          tickets: tickets.map((ticket) => ({
            status: ticket.status,
            id: ticket.status === "ok" ? ticket.id : undefined,
            message:
              ticket.status === "error"
                ? ticket.message
                : undefined,
            details:
              ticket.status === "error"
                ? ticket.details
                : undefined,
          })),
        });

        for (const ticket of tickets) {
          if (ticket.status === "error") {
            console.error(
              "BOOKEASY: Expo rejected push notification.",
              {
                recipientType,
                type: notification.type,
                message: ticket.message,
                details: ticket.details,
              }
            );
          }
        }
} catch (error) {
  allPushesAccepted = false;

  console.error(
    "BOOKEASY: Failed to send Expo push notification.",
    {
      recipientType,
      type: notification.type,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }
  );
}
    }
  } catch (error) {
    console.error("BOOKEASY: Send push notification error.", {
      notificationId: notification?._id?.toString(),
      type: notification?.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
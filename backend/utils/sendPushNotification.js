// import { Expo } from "expo-server-sdk";
// import PushToken from "../models/PushToken.js";
// import { normalizePhone } from "./normalizePhone.js";

// const expo = new Expo();

// export async function sendPushForNotification(notification) {
//   try {
//     let pushTokens = [];

//     // =====================================================
//     // FIND BUSINESS OWNER DEVICE TOKENS
//     // =====================================================

//     if (notification.businessId) {
//       pushTokens = await PushToken.find({
//         businessId: notification.businessId,
//       });
//     }

//     // =====================================================
//     // FIND CUSTOMER DEVICE TOKENS
//     // =====================================================

// else if (notification.customerPhone) {
//   const customerPhone = normalizePhone(
//     notification.customerPhone
//   );

//   pushTokens = await PushToken.find({
//     customerPhone,
//   });
// }

//     if (!pushTokens.length) {
//       console.log(
//         "BOOKEASY: No push token found:",
//         notification._id
//       );

//       return;
//     }

//     console.log(
//       "BOOKEASY: Push tokens found:",
//       pushTokens.length
//     );

//     const messages = [];

//     for (const tokenRecord of pushTokens) {
//       const token = tokenRecord.expoPushToken;

//       // ===================================================
//       // VALIDATE EXPO TOKEN
//       // ===================================================

//       if (!Expo.isExpoPushToken(token)) {
//         console.log(
//           "BOOKEASY: Invalid Expo push token:",
//           token
//         );

//         continue;
//       }

//       messages.push({
//         to: token,

//         title: notification.title,

//         body: notification.message,

//         priority: "high",

//         channelId: "bookeasy",

//         data: {
//           notificationId:
//             notification._id.toString(),

//           bookingId:
//             notification.bookingId
//               ? notification.bookingId.toString()
//               : null,

//           type: notification.type,

//           screen:
//             notification.businessId
//               ? "/business"
//               : "/customer",
//         },
//       });
//     }

//     if (!messages.length) {
//       console.log(
//         "BOOKEASY: No valid push messages."
//       );

//       return;
//     }

//     console.log(
//       "BOOKEASY: Sending push messages:",
//       messages.length
//     );

//     // =====================================================
//     // SEND PUSH NOTIFICATIONS
//     // =====================================================

//     const chunks =
//       expo.chunkPushNotifications(messages);

//     for (const chunk of chunks) {
//       try {
//         const tickets =
//           await expo.sendPushNotificationsAsync(
//             chunk
//           );

//         console.log(
//           "BOOKEASY: PUSH TICKETS:",
//           JSON.stringify(
//             tickets,
//             null,
//             2
//           )
//         );
//       } catch (error) {
//         console.log(
//           "BOOKEASY: Expo push send error:",
//           error
//         );
//       }
//     }
//   } catch (error) {
//     console.log(
//       "BOOKEASY: Send push notification error:",
//       error
//     );
//   }
// }


import { Expo } from "expo-server-sdk";
import PushToken from "../models/PushToken.js";
import { normalizePhone } from "./normalizePhone.js";

const expo = new Expo();

export async function sendPushForNotification(notification) {
  try {
    let pushTokens = [];

    // 1. Find business owner's device tokens
    if (notification.businessId) {
      pushTokens = await PushToken.find({
        businessId: notification.businessId,
      });
    }

    // 2. Find customer's device tokens
    else if (notification.customerPhone) {
      const customerPhone = normalizePhone(
        notification.customerPhone
      );

      pushTokens = await PushToken.find({
        customerPhone,
      });
    }

    if (!pushTokens.length) {
      console.warn(
        "BOOKEASY: No push token found",
        {
          notificationId: notification._id?.toString(),
          businessId: notification.businessId?.toString(),
          customerPhone: notification.customerPhone,
          type: notification.type,
        }
      );

      return;
    }

    console.log(
      "BOOKEASY: Push tokens found:",
      pushTokens.length,
      "Type:",
      notification.type
    );

    const messages = [];

    for (const tokenRecord of pushTokens) {
      const token = tokenRecord.expoPushToken;

      if (!Expo.isExpoPushToken(token)) {
        console.error(
          "BOOKEASY: Invalid Expo push token:",
          token
        );
        continue;
      }

      messages.push({
        to: token,
        title: notification.title,
        body: notification.message,
        sound: "default",
        priority: "high",
        channelId: "bookeasy",
        data: {
          notificationId: notification._id?.toString(),
          bookingId: notification.bookingId
            ? notification.bookingId.toString()
            : null,
          type: notification.type,
          screen: notification.businessId
            ? "/business"
            : "/customer",
        },
      });
    }

    if (!messages.length) {
      console.error(
        "BOOKEASY: No valid push messages"
      );
      return;
    }

    console.log(
      "BOOKEASY: Sending push messages:",
      messages.length
    );

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(
          chunk
        );

        console.log(
          "BOOKEASY: PUSH TICKETS:",
          JSON.stringify(tickets, null, 2)
        );

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];

          if (ticket.status === "ok") {
            console.log(
              "BOOKEASY: Expo accepted push. Ticket ID:",
              ticket.id
            );
          } else {
            console.error(
              "BOOKEASY: Push ticket failed:",
              JSON.stringify(ticket, null, 2)
            );
          }
        }
      } catch (error) {
        console.error(
          "BOOKEASY: Expo push send error:",
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "BOOKEASY: Send push notification error:",
      error
    );
  }
}

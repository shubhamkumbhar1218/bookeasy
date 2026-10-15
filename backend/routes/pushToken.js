// import express from "express";
// import PushToken from "../models/PushToken.js";
// import authMiddleware from "../middleware/authMiddleware.js";
// import { normalizePhone } from "../utils/normalizePhone.js";
// import { Expo } from "expo-server-sdk";

// const router = express.Router();

// // =====================================================
// // BUSINESS OWNER PUSH TOKEN
// // =====================================================

// router.post(
//   "/register",
//   authMiddleware,
//   async (req, res) => {
//     try {
//       const {
//         expoPushToken,
//         platform,
//       } = req.body;

//       if (!expoPushToken) {
//         return res.status(400).json({
//           message:
//             "Expo push token is required",
//         });
//       }

//       // Remove old token(s) for this business owner
// await PushToken.deleteMany({
//   businessId: req.user.id,
// });

// // Register the current token

// const tokenRecord = await PushToken.findOneAndUpdate(
//   {
//     expoPushToken,
//     businessId: null,
//     customerPhone: normalizedPhone,
//   },
//   {
//     $set: {
//       expoPushToken,
//       businessId: null,
//       customerPhone: normalizedPhone,
//       platform: platform || "unknown",
//     },
//   },
//   {
//     upsert: true,
//     new: true,
//     setDefaultsOnInsert: true,
//   }
// );

// console.log("BOOKEASY: CUSTOMER TOKEN SAVED", {
//   id: tokenRecord._id.toString(),
//   customerPhone: tokenRecord.customerPhone,
//   businessId: tokenRecord.businessId,
//   tokenPrefix: tokenRecord.expoPushToken.slice(0, 25),
// });

//       res.json({
//         message:
//           "Business push token registered",
//       });
//     } catch (error) {
//       console.log(
//         "Business push token error:",
//         error
//       );

//       res.status(500).json({
//         message: "Server error",
//       });
//     }
//   }
// );

// router.post("/customer", async (req, res) => {
//   try {
//     const { expoPushToken, customerPhone, platform } = req.body;

//     if (!expoPushToken || !customerPhone) {
//       return res.status(400).json({
//         message: "Expo push token and customer phone are required",
//       });
//     }

//     if (!Expo.isExpoPushToken(expoPushToken)) {
//       return res.status(400).json({
//         message: "Invalid Expo push token",
//       });
//     }

//     const normalizedPhone = normalizePhone(customerPhone);

//     if (!/^\d{10}$/.test(normalizedPhone)) {
//       return res.status(400).json({
//         message: "Enter a valid Indian mobile number",
//       });
//     }

//     // Keep customer registration separate from business registration.
//     await PushToken.findOneAndUpdate(
//       {
//         expoPushToken,
//         businessId: null,
//         customerPhone: normalizedPhone,
//       },
//       {
//         $set: {
//           expoPushToken,
//           businessId: null,
//           customerPhone: normalizedPhone,
//           platform: platform || "unknown",
//         },
//       },
//       {
//         upsert: true,
//         new: true,
//         setDefaultsOnInsert: true,
//       }
//     );

//     console.log(
//       "BOOKEASY: Customer push token registered:",
//       normalizedPhone
//     );

//     return res.status(200).json({
//       message: "Customer push token registered",
//     });
//   } catch (error) {
//     console.error(
//       "BookEasy customer push registration error:",
//       error
//     );

//     return res.status(500).json({
//       message: "Server error",
//     });
//   }
// });



// // =====================================================
// // TEST PUSH NOTIFICATION
// // TEMPORARY TEST ENDPOINT
// // =====================================================

// router.post(
//   "/test",
//   authMiddleware,
//   async (req, res) => {
//     try {
//       const { expoPushToken } = req.body;

//       if (!expoPushToken) {
//         return res.status(400).json({
//           message:
//             "Expo push token is required",
//         });
//       }

//       const { Expo } =
//         await import("expo-server-sdk");

//       const expo = new Expo();

//       if (
//         !Expo.isExpoPushToken(
//           expoPushToken
//         )
//       ) {
//         return res.status(400).json({
//           message:
//             "Invalid Expo push token",
//         });
//       }

//       const message = {
//         to: expoPushToken,

//         title: "🔔 BookEasy Test",

//         body:
//           "Your BookEasy push notification is working!",

//         priority: "high",

//         channelId: "bookeasy",

//         data: {
//           type: "test",
//           screen: "/",
//         },
//       };

//       const tickets =
//         await expo.sendPushNotificationsAsync([
//           message,
//         ]);

//       console.log(
//         "BOOKEASY TEST PUSH:",
//         JSON.stringify(
//           tickets,
//           null,
//           2
//         )
//       );

//       res.json({
//         message:
//           "Test push sent successfully",
//         tickets,
//       });
//     } catch (error) {
//       console.log(
//         "BOOKEASY TEST PUSH ERROR:",
//         error
//       );

//       res.status(500).json({
//         message:
//           "Failed to send test push",
//         error:
//           error.message,
//       });
//     }
//   }
// );
// export default router;











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

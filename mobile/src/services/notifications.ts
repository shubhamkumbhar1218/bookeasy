import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../api";

// ======================================================
// REGISTER FOR EXPO PUSH NOTIFICATIONS
// ======================================================

async function readApiResponse(response: Response) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch {
    console.error(
      "BookEasy API returned non-JSON content:",
      response.status,
      responseText.slice(0, 300)
    );

    return {
      message: "The server returned an invalid response.",
    };
  }
}

export async function registerForPushNotifications() {
  try {
    const Notifications = await import("expo-notifications");

    if (!Device.isDevice) {
      console.log(
        "Push notifications require a physical device."
      );
      return null;
    }

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "bookeasy",
        {
          name: "BookEasy Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        }
      );
    }

    // Check notification permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "BOOKEASY: Notification permission denied."
      );
      return null;
    }

    // Get Expo project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log(
        "BOOKEASY: Expo project ID not found."
      );
      return null;
    }

    // Get Expo push token
    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const expoPushToken = tokenResponse.data;

    console.log(
      "BOOKEASY EXPO PUSH TOKEN:",
      expoPushToken
    );

    return expoPushToken;
  } catch (error) {
    console.log(
      "BOOKEASY push registration error:",
      error
    );
    return null;
  }
}

// ======================================================
// REGISTER PUSH TOKEN WITH BACKEND
// role: "business", "customer", or "auto"
// ======================================================

export async function registerPushTokenWithBackend(
  role: "business" | "customer" | "auto" = "auto"
) {
  try {
    console.log("BOOKEASY REGISTER ROLE:", role);
    const savedUser =
      await AsyncStorage.getItem("bookeasy_user");

    const savedToken =
      await AsyncStorage.getItem("bookeasy_token");

    const customerPhone =
      await AsyncStorage.getItem(
        "bookeasy_customer_phone"
      );

      console.log(
  "BOOKEASY SAVED CUSTOMER PHONE:",
  customerPhone
);

    const user = savedUser
      ? JSON.parse(savedUser)
      : null;

    // Get the Expo push token
    const expoPushToken =
      await registerForPushNotifications();

      console.log(
  "BOOKEASY TOKEN RESULT:",
  expoPushToken ? "Token received" : "No token"
);

    if (!expoPushToken) {
      console.log(
        "BOOKEASY: No Expo push token available."
      );
      return;
    }

    // Determine registration role
    const isBusinessOwner =
      role === "business" ||
      (
        role === "auto" &&
        Boolean((user?.id || user?._id) && savedToken)
      );

    // --------------------------------------------------
    // BUSINESS OWNER TOKEN REGISTRATION
    // --------------------------------------------------

    if (isBusinessOwner) {
      if (!savedToken) {
        console.log(
          "BOOKEASY: Business login token missing."
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/push-tokens/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({
            expoPushToken,
            platform: Platform.OS,
          }),
        }
      );

      const data = await readApiResponse(response);

      console.log(
        "BUSINESS PUSH TOKEN RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        console.log(
          "BOOKEASY: Business push token registration failed."
        );
      }

      return;
    }

    // --------------------------------------------------
    // CUSTOMER TOKEN REGISTRATION
    // --------------------------------------------------

    if (role === "customer" || role === "auto") {
      if (!customerPhone) {
        console.log(
          "BOOKEASY: Customer phone number missing."
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/push-tokens/customer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expoPushToken,
            customerPhone: customerPhone.trim(),
            platform: Platform.OS,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "CUSTOMER PUSH TOKEN RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        console.log(
          "BOOKEASY: Customer push token registration failed."
        );
      }

      return;
    }

    console.log(
      "BOOKEASY: No matching role found."
    );
  } catch (error) {
    console.log(
      "BOOKEASY push token backend error:",
      error
    );
  }
}

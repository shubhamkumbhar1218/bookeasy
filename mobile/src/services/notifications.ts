import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API_URL from "../api";

export async function registerForPushNotifications() {
  try {
    // Load expo-notifications only when this function
    // is actually called.
    const Notifications =
      await import("expo-notifications");

    if (!Device.isDevice) {
      console.log(
        "Push notifications require a physical device."
      );

      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "bookeasy",
        {
          name: "BookEasy Notifications",

          importance:
            Notifications.AndroidImportance.MAX,

          vibrationPattern: [
            0,
            250,
            250,
            250,
          ],
        }
      );
    }

    const {
      status: existingStatus,
    } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const {
        status,
      } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "BookEasy notification permission denied."
      );

      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas
        ?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log(
        "BookEasy EAS project ID not found."
      );

      return null;
    }

    const token =
      (
        await Notifications.getExpoPushTokenAsync(
          {
            projectId,
          }
        )
      ).data;

    console.log(
      "BOOKEASY EXPO PUSH TOKEN:",
      token
    );

    return token;
  } catch (error) {
    console.log(
      "Push registration error:",
      error
    );

    return null;
  }
}

// ======================================================
// REGISTER PUSH TOKEN WITH BACKEND
// ======================================================

export async function registerPushTokenWithBackend() {
  try {
    const savedUser =
      await AsyncStorage.getItem(
        "bookeasy_user"
      );

    const savedToken =
      await AsyncStorage.getItem(
        "bookeasy_token"
      );

    const customerPhone =
      await AsyncStorage.getItem(
        "bookeasy_customer_phone"
      );

    const user = savedUser
      ? JSON.parse(savedUser)
      : null;

    const expoPushToken =
      await registerForPushNotifications();

    console.log(
      "BOOKEASY EXPO PUSH TOKEN:",
      expoPushToken
    );

    if (!expoPushToken) {
      return;
    }

    // ==================================================
    // CUSTOMER
    // ==================================================
    // Check customerPhone FIRST.
    // This prevents a customer session from being
    // incorrectly treated as a business owner.

    if (customerPhone) {
      const response =
        await fetch(
          `${API_URL}/push-tokens/customer`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              expoPushToken,

              customerPhone:
                customerPhone.trim(),

              platform:
                Platform.OS,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "CUSTOMER PUSH TOKEN RESPONSE:",
        response.status,
        data
      );

      return;
    }

    // ==================================================
    // BUSINESS OWNER
    // ==================================================

    if (user?.id || user?._id) {
      if (!savedToken) {
        console.log(
          "Business token not found."
        );

        return;
      }

      const response =
        await fetch(
          `${API_URL}/push-tokens/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${savedToken}`,
            },

            body: JSON.stringify({
              expoPushToken,
              platform:
                Platform.OS,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "BUSINESS PUSH TOKEN RESPONSE:",
        response.status,
        data
      );
    }
  } catch (error) {
    console.log(
      "Push token backend error:",
      error
    );
  }
}
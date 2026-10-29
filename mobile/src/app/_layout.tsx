import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerPushTokenWithBackend,
} from "../services/notifications";

export default function RootLayout() {
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === "expo";

    if (isExpoGo) {
      console.log("BOOKEASY: Expo Go detected.");
      console.log(
        "BOOKEASY: Remote push notifications require a native development build."
      );
      return;
    }

    let notificationReceivedSubscription: any;
    let notificationResponseSubscription: any;
    let isMounted = true;

    const setupNotifications = async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Show notifications when the app is open.
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Register the business-owner device.
        // Customer registration belongs in the customer booking flow.
        await registerPushTokenWithBackend("business");

        if (!isMounted) return;

        // Notification received while the app is running.
        notificationReceivedSubscription =
          Notifications.addNotificationReceivedListener(
            (notification) => {
              console.log(
                "BOOKEASY: NOTIFICATION RECEIVED:",
                notification
              );
            }
          );

        // Handle notification taps.
        notificationResponseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            (response) => {
              const data =
                response.notification.request.content.data;

              console.log(
                "BOOKEASY: NOTIFICATION CLICKED:",
                data
              );

              if (
                typeof data?.screen === "string" &&
                data.screen.startsWith("/")
              ) {
                router.push(data.screen as any);
              }
            }
          );

        console.log(
          "BOOKEASY: Native push notifications initialized."
        );
      } catch (error) {
        console.log(
          "BOOKEASY: Notification setup error:",
          error
        );
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
      notificationReceivedSubscription?.remove();
      notificationResponseSubscription?.remove();
    };
  }, []);

return (
  <SafeAreaProvider>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  </SafeAreaProvider>
);
}
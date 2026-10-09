import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import Constants from "expo-constants";

export default function RootLayout() {
  useEffect(() => {
    const isExpoGo =
      Constants.appOwnership === "expo";

    // =====================================================
    // EXPO GO
    // =====================================================

    if (isExpoGo) {
      console.log(
        "BOOKEASY: Expo Go detected."
      );

      console.log(
        "BOOKEASY: Remote push notifications are disabled in Expo Go."
      );

      return;
    }

    // =====================================================
    // NATIVE DEVELOPMENT BUILD
    // =====================================================

    let notificationReceivedSubscription: any;
    let notificationResponseSubscription: any;

    const setupNotifications = async () => {
      try {
        const Notifications =
          await import("expo-notifications");

        // =================================================
        // SHOW NOTIFICATION WHILE APP IS OPEN
        // =================================================

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // =================================================
        // REGISTER DEVICE
        // =================================================

        const {
          registerPushTokenWithBackend,
        } = await import(
          "../services/notifications"
        );

        await registerPushTokenWithBackend();

        // =================================================
        // NOTIFICATION RECEIVED
        // =================================================

        notificationReceivedSubscription =
          Notifications.addNotificationReceivedListener(
            (notification) => {
              console.log(
                "BOOKEASY: NOTIFICATION RECEIVED:",
                notification
              );
            }
          );

        // =================================================
        // NOTIFICATION CLICKED
        // =================================================

        notificationResponseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            (response) => {
              const data =
                response.notification.request.content
                  .data;

              console.log(
                "BOOKEASY: NOTIFICATION CLICKED:",
                data
              );

              if (data?.screen) {
                router.push(
                  data.screen as any
                );
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

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      notificationReceivedSubscription?.remove();

      notificationResponseSubscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack />
    </SafeAreaProvider>
  );
}
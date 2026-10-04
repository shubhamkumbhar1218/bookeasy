import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import API_URL from "../../api";

type Notification = {
  _id: string;
  message: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
};

export default function CustomerNotificationsScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
  }>();

  const [phone, setPhone] = useState(
    params.phone || ""
  );

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    if (!phone.trim()) {
      setError(
        "Phone number is required to view notifications."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/notifications/customer?phone=${encodeURIComponent(
          phone.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load notifications."
        );
      }

      setNotifications(
        Array.isArray(data)
          ? data
          : data.notifications || []
      );
    } catch (error) {
      console.log(
        "Customer notifications error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.phone) {
      loadNotifications();
    }
  }, []);

  const markAsRead = async (
    notificationId: string
  ) => {
    try {
      await fetch(
        `${API_URL}/notifications/customer/${notificationId}/read`,
        {
          method: "PATCH",
        }
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.log(
        "Mark notification read error:",
        error
      );
    }
  };

  const getNotificationIcon = (
    type?: string
  ) => {
    const value = type?.toLowerCase() || "";

    if (value.includes("confirm")) {
      return "✅";
    }

    if (
      value.includes("cancel")
    ) {
      return "❌";
    }

    if (
      value.includes("reschedule")
    ) {
      return "📅";
    }

    if (
      value.includes("complete")
    ) {
      return "🎉";
    }

    return "🔔";
  };

  const formatDate = (
    dateString?: string
  ) => {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.isRead
    ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadNotifications}
        />
      }
    >
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Notifications
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Intro */}

      <View style={styles.introCard}>
        <View style={styles.iconCircle}>
          <Text style={styles.mainIcon}>
            🔔
          </Text>
        </View>

        <View style={styles.introTextContainer}>
          <Text style={styles.introTitle}>
            Booking Updates
          </Text>

          <Text style={styles.introSubtitle}>
            Stay updated about your appointments.
          </Text>
        </View>

        {unreadCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Error */}

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {/* Loading */}

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            🔔
          </Text>

          <Text style={styles.emptyTitle}>
            No notifications
          </Text>

          <Text style={styles.emptyText}>
            You don't have any booking updates yet.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {notifications.map(
            (notification) => (
              <TouchableOpacity
                key={notification._id}
                activeOpacity={0.8}
                style={[
                  styles.notificationCard,
                  !notification.isRead &&
                    styles.unreadCard,
                ]}
                onPress={() => {
                  if (!notification.isRead) {
                    markAsRead(
                      notification._id
                    );
                  }
                }}
              >
                <View
                  style={styles.notificationIcon}
                >
                  <Text style={styles.iconText}>
                    {getNotificationIcon(
                      notification.type
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.notificationContent
                  }
                >
                  <Text
                    style={[
                      styles.message,
                      !notification.isRead &&
                        styles.unreadMessage,
                    ]}
                  >
                    {notification.message}
                  </Text>

                  {notification.createdAt && (
                    <Text
                      style={styles.timestamp}
                    >
                      {formatDate(
                        notification.createdAt
                      )}
                    </Text>
                  )}
                </View>

                {!notification.isRead && (
                  <View
                    style={styles.unreadDot}
                  />
                )}
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {/* Buttons */}

      <TouchableOpacity
        style={styles.bookingsButton}
        onPress={() =>
          router.push({
            pathname: "/customer/bookings",
            params: {
              phone,
            },
          })
        }
      >
        <Text style={styles.bookingsButtonText}>
          View My Bookings
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dashboardButton}
        onPress={() =>
          router.push("/customer/dashboard")
        }
      >
        <Text style={styles.dashboardButtonText}>
          Find a Business
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    height: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 38,
    lineHeight: 40,
    color: "#111827",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  introCard: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  mainIcon: {
    fontSize: 24,
  },

  introTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  introSubtitle: {
    color: "#6b7280",
    marginTop: 3,
    fontSize: 13,
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
  },

  countText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },

  listContainer: {
    marginHorizontal: 16,
  },

  notificationCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  unreadCard: {
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },

  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  iconText: {
    fontSize: 20,
  },

  notificationContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  message: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20,
  },

  unreadMessage: {
    color: "#111827",
    fontWeight: "700",
  },

  timestamp: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 5,
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#111827",
  },

  loadingContainer: {
    alignItems: "center",
    padding: 30,
  },

  loadingText: {
    color: "#6b7280",
    marginTop: 10,
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
  },

  emptyText: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },

  errorText: {
    color: "#b91c1c",
    marginHorizontal: 18,
    marginBottom: 10,
  },

  bookingsButton: {
    height: 50,
    backgroundColor: "#111827",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  bookingsButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },

  dashboardButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#111827",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  dashboardButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 15,
  },
});
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import API_URL from "../../api";

type NotificationItem = {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  bookingId?: string;
};

export default function BusinessNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/business/login");
        return;
      }

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load notifications"
        );
      }

      console.log("BUSINESS NOTIFICATIONS:", data);

      setNotifications(
        Array.isArray(data)
          ? data
          : data.notifications || []
      );
    } catch (error: any) {
      console.log("Notifications error:", error);

      Alert.alert(
        "Error",
        error.message || "Unable to load notifications"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const markAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem(
        "bookeasy_token"
      );

      if (!token) return;

      const response = await fetch(
        `${API_URL}/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to mark notification as read"
        );
      }

      // Update local UI
      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === id
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

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem(
        "bookeasy_token"
      );

      if (!token) return;

      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to mark all notifications as read"
        );
      }

      console.log(
        "MARK ALL READ RESPONSE:",
        data
      );

      // Update local UI
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error: any) {
      console.log(
        "Mark all read error:",
        error
      );

      Alert.alert(
        "Error",
        error.message ||
          "Unable to mark all notifications as read"
      );
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date?: string) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =====================================================
  // RENDER NOTIFICATION
  // =====================================================

  const renderNotification = ({
    item,
  }: {
    item: NotificationItem;
  }) => {
    const unread = item.isRead !== true;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          unread && styles.unreadCard,
        ]}
        onPress={() => {
          if (unread) {
            markAsRead(item._id);
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔔</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {item.title || "New Notification"}
            </Text>

            {unread && (
              <View style={styles.unreadDot} />
            )}
          </View>

          <Text style={styles.message}>
            {item.message ||
              "You have a new notification."}
          </Text>

          {item.createdAt && (
            <Text style={styles.date}>
              {formatDate(item.createdAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // IMPORTANT:
  // Use isRead, not read
  const unreadCount = notifications.filter(
    (notification) =>
      notification.isRead !== true
  ).length;

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>

          {unreadCount > 0 && (
            <Text style={styles.unreadText}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.readAllButton}
          >
            <Text style={styles.readAllText}>
              Read all
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Notifications */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            🔔
          </Text>

          <Text style={styles.emptyTitle}>
            No notifications
          </Text>

          <Text style={styles.emptyMessage}>
            New appointment and booking
            notifications will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  header: {
    minHeight: 90,
    paddingTop: 42,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 36,
    lineHeight: 40,
    color: "#111827",
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 4,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  unreadText: {
    marginTop: 2,
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },

  readAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  readAllText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
  },

  headerSpacer: {
    width: 55,
  },

  list: {
    padding: 16,
    paddingBottom: 30,
  },

  notificationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  unreadCard: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  icon: {
    fontSize: 21,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2563eb",
    marginLeft: 8,
  },

  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },

  date: {
    marginTop: 8,
    fontSize: 12,
    color: "#9ca3af",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b7280",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 35,
  },

  emptyIcon: {
    fontSize: 55,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  emptyMessage: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
  },
});
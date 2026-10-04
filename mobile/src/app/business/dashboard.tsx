import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API_URL from "../../api";

type User = {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessSlug: string;
  businessType: string;
};

type Stats = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayEarnings: number;
};

export default function BusinessDashboard() {
  const [user, setUser] = useState<User | null>(null);

  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    todayEarnings: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");
      const userData = await AsyncStorage.getItem("bookeasy_user");

      if (!token || !userData) {
        router.replace("/business/login");
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      const response = await fetch(
        `${API_URL}/bookings/stats/${parsedUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStats({
          totalBookings: data.totalBookings || 0,
          pendingBookings: data.pendingBookings || 0,
          confirmedBookings: data.confirmedBookings || 0,
          completedBookings: data.completedBookings || 0,
          cancelledBookings: data.cancelledBookings || 0,
          todayEarnings: data.todayEarnings || 0,
        });
      } else if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);

        router.replace("/business/login");
      }
    } catch (error) {
      console.log("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "bookeasy_token",
              "bookeasy_user",
              "bookeasy_role",
            ]);

            router.replace("/");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />

        <Text style={styles.loadingText}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Header */}

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Welcome back 👋
            </Text>

            <Text style={styles.businessName}>
              {user?.businessName || "Your Business"}
            </Text>

            <Text style={styles.businessType}>
              {user?.businessType || "Business"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() =>
              router.push("/business/notifications")
            }
          >
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}

        <Text style={styles.sectionTitle}>
          Booking Overview
        </Text>

        <View style={styles.statsGrid}>
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>💰</Text>

    <Text style={styles.statNumber}>
      ₹{stats.todayEarnings}
    </Text>

    <Text style={styles.statLabel}>
      Revenue
    </Text>
  </View>

  <View style={styles.statCard}>
    <Text style={styles.statIcon}>📅</Text>

    <Text style={styles.statNumber}>
      {stats.totalBookings}
    </Text>

    <Text style={styles.statLabel}>
      Total Bookings
    </Text>
  </View>

  {/* existing cards... */}

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏳</Text>

            <Text style={styles.statNumber}>
              {stats.pendingBookings}
            </Text>

            <Text style={styles.statLabel}>
              Pending
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>

            <Text style={styles.statNumber}>
              {stats.confirmedBookings}
            </Text>

            <Text style={styles.statLabel}>
              Confirmed
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✔️</Text>

            <Text style={styles.statNumber}>
              {stats.completedBookings}
            </Text>

            <Text style={styles.statLabel}>
              Completed
            </Text>
          </View>
        </View>

        {/* Quick Actions */}

        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/bookings")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>📅</Text>
            </View>

            <Text style={styles.actionTitle}>
              Bookings
            </Text>

            <Text style={styles.actionDescription}>
              Manage appointments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/services")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>🛠️</Text>
            </View>

            <Text style={styles.actionTitle}>
              Services
            </Text>

            <Text style={styles.actionDescription}>
              Manage your services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/notifications")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>🔔</Text>
            </View>

            <Text style={styles.actionTitle}>
              Notifications
            </Text>

            <Text style={styles.actionDescription}>
              View booking updates
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/settings")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>⚙️</Text>
            </View>

            <Text style={styles.actionTitle}>
              Settings
            </Text>

            <Text style={styles.actionDescription}>
              Manage business
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cancelled */}

        <View style={styles.cancelledCard}>
          <View>
            <Text style={styles.cancelledTitle}>
              Cancelled Bookings
            </Text>

            <Text style={styles.cancelledDescription}>
              Total cancelled appointments
            </Text>
          </View>

          <Text style={styles.cancelledNumber}>
            {stats.cancelledBookings}
          </Text>
        </View>

        {/* Logout */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            🚪 Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    color: "#dbeafe",
    fontSize: 14,
    marginBottom: 5,
  },

  businessName: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "800",
  },

  businessType: {
    color: "#dbeafe",
    fontSize: 13,
    marginTop: 5,
    textTransform: "capitalize",
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  notificationIcon: {
    fontSize: 22,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  statIcon: {
    fontSize: 22,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  statLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  actionIcon: {
    fontSize: 20,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  actionDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 17,
  },

  cancelledCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  cancelledTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  cancelledDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },

  cancelledNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#dc2626",
  },

  logoutButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "800",
  },
});
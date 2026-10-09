import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
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

export default function BusinessDashboard() {
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
  const backAction = () => {
    router.replace("/");
    return true;
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction
  );

  return () => backHandler.remove();
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
        {/* ========================= */}
        {/* HEADER */}
        {/* ========================= */}

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
            <Text style={styles.notificationIcon}>
              🔔
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================= */}
        {/* WELCOME CARD */}
        {/* ========================= */}

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconBox}>
            <Text style={styles.welcomeIcon}>
              📅
            </Text>
          </View>

          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>
              Manage your business
            </Text>

            <Text style={styles.welcomeDescription}>
              Manage bookings, services, notifications and
              business settings from one place.
            </Text>
          </View>
        </View>

        {/* ========================= */}
        {/* QUICK ACTIONS */}
        {/* ========================= */}

        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>
          {/* Bookings */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/bookings")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>
                📅
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Bookings
            </Text>

            <Text style={styles.actionDescription}>
              Manage appointments
            </Text>
          </TouchableOpacity>

          {/* Services */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/services")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>
                🛠️
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Services
            </Text>

            <Text style={styles.actionDescription}>
              Manage your services
            </Text>
          </TouchableOpacity>

          {/* Reports */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/reports")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>
                📊
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Reports
            </Text>

            <Text style={styles.actionDescription}>
              View business analytics
            </Text>
          </TouchableOpacity>

          {/* Notifications */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/notifications")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>
                🔔
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Notifications
            </Text>

            <Text style={styles.actionDescription}>
              View booking updates
            </Text>
          </TouchableOpacity>

          {/* Settings */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push("/business/settings")
            }
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>
                ⚙️
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Settings
            </Text>

            <Text style={styles.actionDescription}>
              Manage business
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================= */}
        {/* REPORTS SHORTCUT */}
        {/* ========================= */}

        <TouchableOpacity
          style={styles.reportsBanner}
          onPress={() =>
            router.push("/business/reports")
          }
        >
          <View style={styles.reportsBannerIcon}>
            <Text style={styles.reportsBannerEmoji}>
              📈
            </Text>
          </View>

          <View style={styles.reportsBannerContent}>
            <Text style={styles.reportsBannerTitle}>
              Reports & Analytics
            </Text>

            <Text style={styles.reportsBannerDescription}>
              Check running and past business performance
              by year and month.
            </Text>
          </View>

          <Text style={styles.reportsArrow}>
            →
          </Text>
        </TouchableOpacity>

        {/* ========================= */}
        {/* LOGOUT */}
        {/* ========================= */}

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

  /* ========================= */
  /* HEADER */
  /* ========================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
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

  /* ========================= */
  /* WELCOME CARD */
  /* ========================= */

  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },

  welcomeIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  welcomeIcon: {
    fontSize: 24,
  },

  welcomeTextContainer: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  welcomeDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
    marginTop: 5,
  },

  /* ========================= */
  /* SECTION */
  /* ========================= */

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },

  /* ========================= */
  /* ACTION GRID */
  /* ========================= */

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 11,
  },

  actionIcon: {
    fontSize: 21,
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

  /* ========================= */
  /* REPORTS BANNER */
  /* ========================= */

  reportsBanner: {
    backgroundColor: "#111827",
    borderRadius: 17,
    padding: 17,
    marginTop: 8,
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
  },

  reportsBannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#1f2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  reportsBannerEmoji: {
    fontSize: 22,
  },

  reportsBannerContent: {
    flex: 1,
  },

  reportsBannerTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  reportsBannerDescription: {
    color: "#d1d5db",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  reportsArrow: {
    color: "#ffffff",
    fontSize: 24,
    marginLeft: 10,
  },

  /* ========================= */
  /* LOGOUT */
  /* ========================= */

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
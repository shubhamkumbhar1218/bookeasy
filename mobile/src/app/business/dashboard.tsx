import { useCallback, useEffect, useState } from "react";
import { BackHandler } from "react-native";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushTokenWithBackend } from "../../services/notifications";
import API_URL from "../../api";
import subscription from "./subscription";

type User = {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessSlug: string;
  businessType: string;
  profilePhoto?: string;
};

export default function BusinessDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


const loadDashboard = useCallback(async () => {
  try {
    const token = await AsyncStorage.getItem("bookeasy_token");
    const userData = await AsyncStorage.getItem("bookeasy_user");

    if (!token || !userData) {
      router.replace("/business/login");
      return;
    }

    // Display cached data immediately while fetching fresh data.
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    try {
      // Fetch the latest business profile from MongoDB via Render.
      const response = await fetch(
        `${API_URL}/business/profile/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const profileData = await response.json();

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);
        router.replace("/business/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          profileData.message || "Unable to refresh business profile."
        );
      }

      // The backend GET endpoint returns the user directly.
      const updatedUser = {
        ...parsedUser,
        ...profileData,
        id: parsedUser.id || profileData.id || profileData._id,
        profilePhoto:
          typeof profileData.profilePhoto === "string"
            ? profileData.profilePhoto
            : parsedUser.profilePhoto || "",
      };

      // Update both the dashboard and local cache.
      setUser(updatedUser);

      await AsyncStorage.setItem(
        "bookeasy_user",
        JSON.stringify(updatedUser)
      );
    } catch (profileError) {
      // Keep cached data visible if the network request fails.
      console.log("Business profile refresh error:", profileError);
    }

    void registerPushTokenWithBackend("business");
  } catch (error) {
    console.log("Dashboard error:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);


useFocusEffect(
  useCallback(() => {
    void loadDashboard();
  }, [loadDashboard])
);

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

    <View style={styles.businessIdentity}>
      {user?.profilePhoto ? (
        <Image
          source={{ uri: user.profilePhoto }}
          style={styles.headerBusinessPhoto}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.headerPhotoPlaceholder}>
          <Text style={styles.headerPhotoIcon}>🏪</Text>
        </View>
      )}

      <View style={styles.businessInfo}>
        <Text style={styles.businessName} numberOfLines={2}>
          {user?.businessName || "Your Business"}
        </Text>

        <Text style={styles.businessType}>
          {user?.businessType || "Business"}
        </Text>
      </View>
    </View>
  </View>

  <TouchableOpacity
    style={styles.notificationButton}
    onPress={() => router.push("/business/notifications")}
    activeOpacity={0.75}
    accessibilityLabel="Open notifications"
  >
    <Text style={styles.notificationIcon}>🔔</Text>
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

          {/* Staff Management */}
<TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/business/staff" as any)}
  activeOpacity={0.8}
>
  <View style={styles.actionIconBox}>
    <Text style={styles.actionIcon}>👥</Text>
  </View>

  <Text style={styles.actionTitle}>Staff Management</Text>

  <Text style={styles.actionDescription}>
    Manage your team and staff members
  </Text>
</TouchableOpacity>

          {/* Reports */}

{/* Reports */}
<TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/business/reports")}
>
  <View style={styles.actionIconBox}>
    <Text style={styles.actionIcon}>📈</Text>
  </View>

  <Text style={styles.actionTitle}>Reports</Text>

  <Text style={styles.actionDescription}>
    View business performance
  </Text>
</TouchableOpacity>


{/* Advanced Analytics — separate from Business Analytics */}
<TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/business/advanced-analytics" as any)}
  activeOpacity={0.8}
>
  <View style={styles.actionIconBox}>
    <Text style={styles.actionIcon}>📊</Text>
  </View>

  <Text style={styles.actionTitle}>Advanced Analytics</Text>

  <Text style={styles.actionDescription}>
    View trends, customer retention and service performance
  </Text>
</TouchableOpacity>


          {/* Subscription */}
<TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/business/subscription" as any)}
  activeOpacity={0.8}
>
  <View style={styles.actionIconBox}>
    <Text style={styles.actionIcon}>👑</Text>
  </View>

  <Text style={styles.actionTitle}>Subscription</Text>

  <Text style={styles.actionDescription}>
    View your plan and booking limits
  </Text>
</TouchableOpacity>

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
    backgroundColor: "#F7F6F0",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F6F0",
  },

  loadingText: {
    marginTop: 12,
    color: "#64766A",
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E9F0E8",
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#D8E3D7",
    elevation: 2,
    shadowColor: "#243B35",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  greeting: {
    color: "#64766A",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
  },

  businessIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  businessInfo: {
    flex: 1,
    minWidth: 0,
  },

  businessName: {
    color: "#243B35",
    fontSize: 20,
    fontWeight: "800",
  },

  businessType: {
    color: "#64766A",
    fontSize: 13,
    marginTop: 5,
    textTransform: "capitalize",
  },

  headerBusinessPhoto: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#F7F5EF",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    marginRight: 13,
  },

  headerPhotoPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#F7F5EF",
    borderWidth: 2,
    borderColor: "#D2DED0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  headerPhotoIcon: {
    fontSize: 28,
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#2F4F43",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#49675A",
    elevation: 3,
    shadowColor: "#243B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  notificationIcon: {
    fontSize: 22,
  },

  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E5E7DF",
    flexDirection: "row",
    alignItems: "center",
  },

  welcomeIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#E9F0E8",
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
    color: "#243B35",
  },

  welcomeDescription: {
    fontSize: 12,
    color: "#64766A",
    lineHeight: 18,
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#243B35",
    marginBottom: 14,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7DF",
    elevation: 1,
    shadowColor: "#243B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },

  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E9F0E8",
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
    color: "#243B35",
  },

  actionDescription: {
    fontSize: 12,
    color: "#64766A",
    marginTop: 4,
    lineHeight: 17,
  },

  reportsBanner: {
    backgroundColor: "#243B35",
    borderRadius: 20,
    padding: 17,
    marginTop: 8,
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
  },

  reportsBannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#365448",
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
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  reportsBannerDescription: {
    color: "#D7E2D9",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  reportsArrow: {
    color: "#FFFFFF",
    fontSize: 24,
    marginLeft: 10,
  },

  logoutButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FCE9E6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F4D3CE",
  },

  logoutText: {
    color: "#B7463A",
    fontSize: 15,
    fontWeight: "800",
  },
});

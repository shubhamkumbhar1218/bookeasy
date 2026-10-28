import { useCallback, useEffect, useState } from "react";
import { BackHandler } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Linking,
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

  const [showHelpFaq, setShowHelpFaq] = useState(false);
const [expandedHelpFaq, setExpandedHelpFaq] = useState<number | null>(null);
const [supportVisible, setSupportVisible] = useState(false);

const businessFaqs = [
  {
    question: "How do I manage bookings?",
    answer:
      "Open Bookings from Quick Actions to review and manage customer appointments.",
  },
  {
    question: "How do I add or manage services?",
    answer:
      "Open Services from Quick Actions to manage the services offered by your business.",
  },
  {
    question: "How do customers book my business?",
    answer:
      "Share your business booking link with customers so they can view your services and book appointments.",
  },
  {
    question: "Where can I view reports?",
    answer:
      "Open Reports to review business performance. Advanced Analytics provides additional insights when your plan supports it.",
  },
  {
    question: "How do I manage my subscription?",
    answer:
      "Open Subscription to view your current plan and available subscription options.",
  },
  {
    question: "How can I contact BookEasy support?",
    answer:
      "Email support.bookeasy@gmail.com or call +91 9022284532 using the support options on this dashboard.",
  },
];

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

  const handleContact = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Unable to open",
      "Please try again or contact BookEasy Management directly."
    );
  }
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

          
{/* Book as Customer */}
<TouchableOpacity
onPress={() => {
  AsyncStorage.setItem("bookeasy_role", "customer")
    .then(() => {
      router.push("/customer/dashboard" as any);
    })
    .catch((error) => {
      console.log("Customer navigation error:", error);
      Alert.alert("Error", "Unable to open customer mode.");
    });
}}
  activeOpacity={0.8}
>
  <View style={styles.actionIconBox}>
    <Text style={styles.actionIcon}>🛍️</Text>
  </View>

  <Text style={styles.actionTitle}>
    Book as Customer
  </Text>

  <Text style={styles.actionDescription}>
    Discover other businesses and book appointments
  </Text>
</TouchableOpacity>

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

          
<TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/legal" as any)}
>
  <View style={styles.actionIconBox}>
    <Text style={styles.actionIcon}>📄</Text>
  </View>

  <Text style={styles.actionTitle}>
    Legal & Policies
  </Text>

  <Text style={styles.actionDescription}>
    Terms, privacy and refunds
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

      
        {/* ================= LEGAL LINKS ================= */}
        <View style={styles.legalLinksContainer}>
          <TouchableOpacity
            onPress={() => router.push("/legal" as any)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="Terms and Conditions"
          >
            <Text style={styles.legalLinkText}>
              Terms & Conditions
            </Text>
          </TouchableOpacity>

          <Text style={styles.legalLinkSeparator}>•</Text>

          <TouchableOpacity
            onPress={() => router.push("/legal" as any)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={styles.legalLinkText}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>


      {/* BUSINESS HELP & FAQ */}
      <View
  style={styles.helpWidgetContainer}
  pointerEvents="box-none"
>

        
{/* Floating Customer Support Popup */}
{supportVisible && (
  <View style={styles.supportPopup}>
    <View style={styles.supportPopupHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.supportPopupTitle}>
          Customer Support
        </Text>
        <Text style={styles.supportPopupSubtitle}>
          We're here to help you
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setSupportVisible(false)}
        style={styles.supportCloseButton}
        accessibilityRole="button"
        accessibilityLabel="Close customer support"
      >
        <Text style={styles.supportCloseText}>✕</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.supportLabel}>EMAIL US</Text>
    <TouchableOpacity
      style={styles.supportContactRow}
      onPress={() =>
        handleContact("mailto:support.bookeasy@gmail.com")
      }
      accessibilityRole="button"
    >
      <Text style={styles.supportContactIcon}>✉️</Text>
      <Text style={styles.supportContactText}>
        support.bookeasy@gmail.com
      </Text>
    </TouchableOpacity>

    <Text style={styles.supportLabel}>CALL US</Text>
    <TouchableOpacity
      style={styles.supportContactRow}
      onPress={() => handleContact("tel:+919022284532")}
      accessibilityRole="button"
    >
      <Text style={styles.supportContactIcon}>📞</Text>
      <Text style={styles.supportContactText}>
        +91 9022284532
      </Text>
    </TouchableOpacity>
  </View>
)}

        {showHelpFaq && (
          <View style={styles.faqFloatingPanel}>
            <View style={styles.faqHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.faqTitle}>Business Help</Text>
                <Text style={styles.faqSubtitle}>
                  Answers for your business
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowHelpFaq(false)}
                accessibilityRole="button"
                accessibilityLabel="Close help panel"
              >
                <Text style={styles.faqCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.faqQuestions}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {businessFaqs.map((faq, index) => {
                const isExpanded = expandedHelpFaq === index;

                return (
                  <View
                    key={faq.question}
                    style={styles.faqItem}
                  >
                    <TouchableOpacity
                      style={styles.faqQuestionButton}
                      onPress={() =>
                        setExpandedHelpFaq(
                          isExpanded ? null : index
                        )
                      }
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <Text style={styles.faqQuestionText}>
                        {faq.question}
                      </Text>

                      <Text style={styles.faqChevron}>
                        {isExpanded ? "−" : "+"}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <Text style={styles.faqAnswer}>
                        {faq.answer}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}


<TouchableOpacity
  style={styles.floatingSupportButton}
  onPress={() => setSupportVisible((previous) => !previous)}
  activeOpacity={0.85}
  accessibilityRole="button"
  accessibilityLabel="Open customer support"
>
  <Text style={styles.floatingSupportButtonText}>🎧</Text>
</TouchableOpacity>


        <TouchableOpacity
          style={styles.helpFloatingButton}
          onPress={() => setShowHelpFaq((current) => !current)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            showHelpFaq
              ? "Close Business Help"
              : "Open Business Help and FAQs"
          }
          accessibilityState={{ expanded: showHelpFaq }}
        >
          <Text style={styles.helpFloatingButtonText}>
            {showHelpFaq ? "×" : "?"}
          </Text>
        </TouchableOpacity>
      </View>
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

  
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginTop: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DCE7F8",
    elevation: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },

  contactTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  contactIconBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  contactMainIcon: {
    fontSize: 26,
  },

  contactHeadingContainer: {
    flex: 1,
  },

  contactEyebrow: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  contactTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
  },

  contactDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  contactAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    marginBottom: 10,
    borderRadius: 15,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "#E5EDFA",
  },

  contactActionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EAF1FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  contactActionIcon: {
    fontSize: 19,
  },

  contactActionTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  contactActionLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 5,
  },

  contactActionValue: {
    color: "#1E293B",
    fontSize: 12,
    fontWeight: "800",
  },

  contactArrow: {
    color: "#2563EB",
    fontSize: 20,
    marginLeft: 8,
  },

  contactFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: "#E8EEF7",
  },

  contactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 9,
  },

  contactFooterText: {
    flex: 1,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
  },

  helpFloatingButton: {
  position: "absolute",
  right: 20,
  bottom: 24,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: "#2563EB",
  alignItems: "center",
  justifyContent: "center",
  elevation: 8,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  zIndex: 100,
},

helpFloatingButtonText: {
  color: "#FFFFFF",
  fontSize: 28,
  fontWeight: "800",
},

faqFloatingPanel: {
  position: "absolute",
  right: 16,
  bottom: 92,
  width: "90%",
  maxWidth: 380,
  maxHeight: "72%",
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: "#DCE7F8",
  elevation: 12,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 8,
  zIndex: 99,
},

helpWidgetContainer: {
  position: "absolute",
  right: 0,
  bottom: 0,
  left: 0,
  top: 0,
  zIndex: 100,
  pointerEvents: "box-none",
},

faqHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 14,
  marginBottom: 6,
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
},

faqTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#243B35",
},

faqSubtitle: {
  marginTop: 4,
  fontSize: 12,
  color: "#64766A",
},

faqCloseText: {
  fontSize: 24,
  color: "#64748B",
  paddingHorizontal: 8,
},

faqQuestions: {
  flexShrink: 1,
},

faqItem: {
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
},

faqQuestionButton: {
  minHeight: 48,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
  gap: 12,
},

faqQuestionText: {
  flex: 1,
  fontSize: 13,
  fontWeight: "700",
  lineHeight: 19,
  color: "#1F2937",
},

faqChevron: {
  fontSize: 21,
  color: "#2563EB",
},

faqAnswer: {
  paddingBottom: 14,
  fontSize: 13,
  lineHeight: 20,
  color: "#64748B",
},


  legalLinksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 10,
    gap: 12,
  },

  legalLinkText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  legalLinkSeparator: {
    color: "#94A3B8",
    fontSize: 14,
  },

  
floatingSupportButton: {
  position: "absolute",
  right: 20,
  bottom: 92,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#DCE7F8",
  alignItems: "center",
  justifyContent: "center",
  elevation: 8,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 6,
  zIndex: 101,
},

floatingSupportButtonText: {
  fontSize: 25,
},

supportPopup: {
  position: "absolute",
  right: 16,
  bottom: 160,
  width: "90%",
  maxWidth: 360,
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 18,
  borderWidth: 1,
  borderColor: "#DCE7F8",
  elevation: 12,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 8,
  zIndex: 102,
},

supportPopupHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 22,
},

supportPopupTitle: {
  fontSize: 21,
  fontWeight: "800",
  color: "#0F172A",
},

supportPopupSubtitle: {
  fontSize: 12,
  color: "#64748B",
  marginTop: 5,
},

supportCloseButton: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#F1F5F9",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 10,
},

supportCloseText: {
  color: "#475569",
  fontSize: 16,
  fontWeight: "700",
},

supportLabel: {
  color: "#64748B",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 1.2,
  marginBottom: 8,
},

supportContactRow: {
  flexDirection: "row",
  alignItems: "center",
  padding: 12,
  marginBottom: 18,
  borderRadius: 12,
  backgroundColor: "#F8FAFF",
  borderWidth: 1,
  borderColor: "#E5EDFA",
},

supportContactIcon: {
  fontSize: 20,
  marginRight: 12,
},

supportContactText: {
  flex: 1,
  color: "#1E293B",
  fontSize: 13,
  fontWeight: "700",
},


});

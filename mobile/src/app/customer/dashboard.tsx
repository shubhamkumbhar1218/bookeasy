import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from "react-native";
import { router } from "expo-router";
import API_URL from "../../api";

type Business = {
  _id?: string;
  businessName: string;
  businessSlug: string;
  profilePhoto?: string;
  businessType?: string;
  phone?: string;
  address?: string;
  averageRating?: number;
  totalReviews?: number;
  services?: {
    _id: string;
    name: string;
    price: number;
    duration: number;
    averageRating?: number;
    totalReviews?: number;
  }[];
};

const categories = [
  { label: "All", value: "All" },
  { label: "Salon", value: "salon" },
  { label: "Barber", value: "barber" },
  { label: "Tutor", value: "tutor" },
  { label: "Gym", value: "gym" },
  { label: "Repair Shop", value: "repair shop" },
  { label: "Hospital", value: "hospital" },
  { label: "Dental Clinic", value: "dental clinic" },
  { label: "Doctor / Clinic", value: "doctor / clinic" },
  { label: "Physiotherapy", value: "physiotherapy" },
  { label: "Spa & Wellness", value: "spa & wellness" },
  { label: "Yoga & Meditation", value: "yoga & meditation" },
  {
    label: "Pet Clinic / Veterinary",
    value: "pet clinic / veterinary",
  },
  {
    label: "Car & Bike Service",
    value: "car & bike service",
  },
  {
    label: "Photography Studio",
    value: "photography studio",
  },
  {
    label: "Coaching Classes",
    value: "coaching classes",
  },
  { label: "Makeup Artist", value: "makeup artist" },
  { label: "Tailor", value: "tailor" },
  { label: "Plumber", value: "plumber" },
  { label: "Electrician", value: "electrician" },
  { label: "Computer Repair", value: "computer repair" },
  { label: "Consultant", value: "consultant" },
  { label: "Driving School", value: "driving school" },
  { label: "Diagnostic Lab", value: "diagnostic lab" },
  {
    label: "Nutritionist / Dietitian",
    value: "nutritionist / dietitian",
  },
  {
    label: "Laundry & Dry Cleaning",
    value: "laundry & dry cleaning",
  },
  { label: "Other", value: "other" },
];

const faqs = [
  {
    question: "How do I book an appointment?",
    answer:
      "Choose a business, open its details, select a service, choose an available date and time, and follow the steps to confirm your booking.",
  },
  {
    question: "Where can I see my bookings?",
    answer:
      "Tap My Bookings on your Customer Dashboard to view your appointments and their current statuses.",
  },
  {
    question: "Can I cancel or reschedule an appointment?",
    answer:
      "Open My Bookings and check the actions available for your appointment. The options depend on its current status and the booking rules.",
  },
  {
    question: "How do I search for a business?",
    answer:
      "Use the search box to search for a business or location. You can also select a category such as Salon, Gym, Hospital, or Dental Clinic.",
  },
  {
    question: "What if my booking is not confirmed?",
    answer:
      "Open My Bookings to check the latest status. If you need assistance, contact the business or BookEasy Management.",
  },
  {
    question: "Do I need to register to book?",
    answer:
      "BookEasy supports customer bookings without requiring a customer account. Follow the booking instructions shown for the selected business.",
  },
  {
    question: "How do I contact BookEasy support?",
    answer:
      "Email support.bookeasy@gmail.com or call +91 9022284532 for help.",
  },
];

export default function CustomerDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
const [selectedCategory, setSelectedCategory] =
  useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

    const [helpVisible, setHelpVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError("");

      let url = `${API_URL}/business/search`;

      const params: string[] = [];

if (search.trim()) {
  params.push(
    `search=${encodeURIComponent(search.trim())}`
  );
}

if (selectedCategory !== "All") {
  params.push(
    `category=${encodeURIComponent(selectedCategory)}`
  );
}

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      console.log("Searching:", url);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load businesses"
        );
      }

      setBusinesses(data.businesses || []);
    } catch (error) {
      console.log(
        "Business search error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load businesses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [selectedCategory]);

  const renderBusiness = ({
    item,
  }: {
    item: Business;
  }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          router.push(
            `/business-details/${item.businessSlug}`
          )
        }
      >
        <View style={styles.cardHeader}>
          {item.profilePhoto ? (
  <Image
    source={{ uri: item.profilePhoto }}
    style={styles.businessPhoto}
    resizeMode="cover"
  />
) : (
  <View style={styles.businessIcon}>
    <Text style={styles.businessIconText}>
      {item.businessName?.charAt(0).toUpperCase() || "B"}
    </Text>
  </View>
)}

          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>
              {item.businessName}
            </Text>

            <Text style={styles.businessType}>
              {item.businessType ||
                "Local Business"}
            </Text>
          </View>
        </View>

        {item.address ? (
          <Text
            style={styles.address}
            numberOfLines={2}
          >
            📍 {item.address}
          </Text>
        ) : null}

        <View style={styles.ratingRow}>
          <Text style={styles.rating}>
            ⭐{" "}
            {item.averageRating
              ? item.averageRating.toFixed(1)
              : "New"}
          </Text>

          <Text style={styles.reviews}>
            {item.totalReviews || 0} reviews
          </Text>
        </View>

        {item.services &&
        item.services.length > 0 ? (
          <Text style={styles.services}>
            {item.services
              .slice(0, 3)
              .map((service) => service.name)
              .join(" • ")}
          </Text>
        ) : null}

        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>
            View Business
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={businesses}
        keyExtractor={(item, index) =>
          item._id ||
          item.businessSlug ||
          index.toString()
        }
        renderItem={renderBusiness}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
<View style={styles.topHeader}>
  <View>
    <Text style={styles.logo}>BookEasy</Text>

    <Text style={styles.headerSubtitle}>
      Customer Dashboard
    </Text>
  </View>

  <View style={styles.headerActions}>
    <TouchableOpacity
      style={styles.helpButton}
      onPress={() => {
        setHelpVisible((previous) => !previous);
        setExpandedFaq(null);
      }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Open Help and Frequently Asked Questions"
    >
      <Text style={styles.helpButtonText}>?</Text>
    </TouchableOpacity>

    <View style={styles.headerIcon}>
      <Text style={styles.headerIconText}>👤</Text>
    </View>
  </View>
</View>

{/* Help & FAQ Panel */}

{helpVisible && (
  <View style={styles.faqCard}>
    <View style={styles.faqHeader}>
      <View style={styles.faqHeading}>
        <Text style={styles.faqTitle}>
          How can we help?
        </Text>

        <Text style={styles.faqSubtitle}>
          Frequently asked questions
        </Text>
      </View>

      <TouchableOpacity
        style={styles.faqCloseButton}
        onPress={() => {
          setHelpVisible(false);
          setExpandedFaq(null);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Close help"
      >
        <Text style={styles.faqCloseText}>✕</Text>
      </TouchableOpacity>
    </View>

    {faqs.map((faq, index) => {
      const isExpanded = expandedFaq === index;

      return (
        <View key={faq.question} style={styles.faqItem}>
          <TouchableOpacity
            style={styles.faqQuestion}
            onPress={() =>
              setExpandedFaq(isExpanded ? null : index)
            }
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            <Text style={styles.faqQuestionText}>
              {faq.question}
            </Text>

            <Text style={styles.faqToggle}>
              {isExpanded ? "−" : "+"}
            </Text>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.faqAnswerBox}>
              <Text style={styles.faqAnswer}>
                {faq.answer}
              </Text>
            </View>
          )}
        </View>
      );
    })}

    <View style={styles.faqSupport}>
      <Text style={styles.faqSupportText}>
        Still need help?
      </Text>

      <TouchableOpacity
        onPress={() =>
          handleContact("mailto:support.bookeasy@gmail.com")
        }
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Email BookEasy support"
      >
        <Text style={styles.faqSupportLink}>
          Contact BookEasy Support
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}

            {/* Back to Business Dashboard */}

<TouchableOpacity
  style={{
    backgroundColor: "#E9F0E8",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D8E3D7",
  }}
  onPress={() => {
    router.replace("/business/dashboard" as any);
  }}
  activeOpacity={0.8}
>
  <Text
    style={{
      color: "#243B35",
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
    }}
  >
    ← Back to Business Dashboard
  </Text>
</TouchableOpacity>

            {/* Title */}

            <Text style={styles.title}>
              Find a Business
            </Text>

            <Text style={styles.subtitle}>
              Book your service quickly and easily.
            </Text>

            {/* Quick Actions */}

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                activeOpacity={0.8}
                onPress={() =>
                  router.push(
                    "/customer/bookings"
                  )
                }
              >
                <View
                  style={styles.quickIconBox}
                >
                  <Text
                    style={styles.quickActionIcon}
                  >
                    📅
                  </Text>
                </View>

                <View>
                  <Text
                    style={
                      styles.quickActionText
                    }
                  >
                    My Bookings
                  </Text>

                  <Text
                    style={
                      styles.quickActionSubtext
                    }
                  >
                    View appointments
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                activeOpacity={0.8}
                onPress={() =>
                  router.push(
                    "/customer/notifications"
                  )
                }
              >
                <View
                  style={styles.quickIconBox}
                >
                  <Text
                    style={styles.quickActionIcon}
                  >
                    🔔
                  </Text>
                </View>

                <View>
                  <Text
                    style={
                      styles.quickActionText
                    }
                  >
                    Notifications
                  </Text>

                  <Text
                    style={
                      styles.quickActionSubtext
                    }
                  >
                    Booking updates
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            
{/* Legal & Policies */}

<TouchableOpacity
  onPress={() => router.push("/legal" as any)}
  activeOpacity={0.8}
  style={{
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  }}
>
  <Text style={{ fontSize: 22, marginRight: 12 }}>
    📄
  </Text>

  <View style={{ flex: 1 }}>
    <Text
      style={{
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
      }}
    >
      Legal & Policies
    </Text>

    <Text
      style={{
        fontSize: 12,
        color: "#6b7280",
        marginTop: 4,
      }}
    >
      Terms, privacy and cancellation/refunds
    </Text>
  </View>

  <Text style={{ fontSize: 20, color: "#6b7280" }}>
    ›
  </Text>
</TouchableOpacity>

{/* BookEasy Management Support */}

<View style={styles.contactCard}>
  <View style={styles.contactTop}>
    <View style={styles.contactIconBox}>
      <Text style={styles.contactMainIcon}>💬</Text>
    </View>

    <View style={styles.contactHeadingContainer}>
      <Text style={styles.contactEyebrow}>
        BOOKEASY SUPPORT
      </Text>

      <Text style={styles.contactTitle}>
        Need a hand?
      </Text>

      <Text style={styles.contactDescription}>
        Questions about booking or using BookEasy? Our management team is here to help.
      </Text>
    </View>
  </View>

  <TouchableOpacity
    style={styles.contactAction}
    onPress={() =>
      handleContact("mailto:support.bookeasy@gmail.com")
    }
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel="Email BookEasy Management"
  >
    <View style={styles.contactActionIconBox}>
      <Text style={styles.contactActionIcon}>✉️</Text>
    </View>

    <View style={styles.contactActionTextContainer}>
      <Text style={styles.contactActionLabel}>
        Email our team
      </Text>
      <Text style={styles.contactActionValue}>
        support.bookeasy@gmail.com
      </Text>
    </View>

    <Text style={styles.contactArrow}>↗</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.contactAction}
    onPress={() =>
      handleContact("tel:+919022284532")
    }
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel="Call BookEasy Management"
  >
    <View style={styles.contactActionIconBox}>
      <Text style={styles.contactActionIcon}>📞</Text>
    </View>

    <View style={styles.contactActionTextContainer}>
      <Text style={styles.contactActionLabel}>
        Give us a call
      </Text>
      <Text style={styles.contactActionValue}>
        +91 9022284532
      </Text>
    </View>

    <Text style={styles.contactArrow}>↗</Text>
  </TouchableOpacity>

  <View style={styles.contactFooter}>
    <View style={styles.contactStatusDot} />
    <Text style={styles.contactFooterText}>
      Here to make your BookEasy experience easier
    </Text>
  </View>
</View>

            {/* Search */}

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>
                🔍
              </Text>

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search location or business"
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={loadBusinesses}
              />

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearch("");
                    setTimeout(
                      loadBusinesses,
                      0
                    );
                  }}
                >
                  <Text
                    style={styles.clearText}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search Button */}

            <TouchableOpacity
              style={styles.searchButton}
              onPress={loadBusinesses}
            >
              <Text
                style={styles.searchButtonText}
              >
                Search Businesses
              </Text>
            </TouchableOpacity>

            {/* Categories */}

            <Text style={styles.categoryTitle}>
              Categories
            </Text>

<FlatList
  horizontal
  data={categories}
  keyExtractor={(item) => item.value}
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.categoryList}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.value &&
          styles.categoryButtonActive,
      ]}
      onPress={() => setSelectedCategory(item.value)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.value &&
            styles.categoryTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  )}
/>

            {/* Results Header */}

            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.resultsTitle}>
                  Nearby Businesses
                </Text>

                <Text
                  style={styles.resultsSubtitle}
                >
                  {selectedCategory === "All"
  ? "Businesses available for booking"
  : `${categories.find(
      (item) => item.value === selectedCategory
    )?.label || selectedCategory} businesses`}
                </Text>
              </View>

              <View style={styles.resultCountBox}>
                <Text
                  style={styles.resultCount}
                >
                  {businesses.length}
                </Text>
              </View>
            </View>

            {/* Loading */}

            {loading && (
              <View style={styles.loading}>
                <ActivityIndicator
                  size="large"
                />

                <Text style={styles.loadingText}>
                  Finding businesses...
                </Text>
              </View>
            )}

            {/* Error */}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>
                  ⚠️
                </Text>

                <Text style={styles.errorText}>
                  {error}
                </Text>

                <TouchableOpacity
                  onPress={loadBusinesses}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>
                🔎
              </Text>

              <Text style={styles.emptyTitle}>
                No businesses found
              </Text>

              <Text style={styles.emptyText}>
                Try another location or
                category.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  listContent: {
    padding: 20,
    paddingBottom: 40,
  },

  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },

  logo: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },

  headerIconText: {
    fontSize: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 18,
  },

  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  quickActionButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  quickActionIcon: {
    fontSize: 19,
  },

  quickActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  quickActionSubtext: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },

  searchBox: {
    height: 52,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  clearText: {
    fontSize: 16,
    color: "#6b7280",
    paddingLeft: 8,
  },

  searchButton: {
    height: 46,
    backgroundColor: "#111827",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  searchButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 22,
    marginBottom: 10,
  },

  categoryList: {
    paddingBottom: 22,
  },

  categoryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },

  categoryButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  categoryText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },

  categoryTextActive: {
    color: "#ffffff",
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  resultsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  resultsSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },

  resultCountBox: {
    minWidth: 36,
    height: 30,
    backgroundColor: "#e5e7eb",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  resultCount: {
    color: "#374151",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  businessIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  businessPhoto: {
  width: 52,
  height: 52,
  borderRadius: 26,
  marginRight: 12,
  backgroundColor: "#E9F0E8",
},

  businessIconText: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "800",
  },

  businessInfo: {
    flex: 1,
  },

  businessName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  businessType: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
  },

  address: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 14,
    lineHeight: 19,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  rating: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginRight: 10,
  },

  reviews: {
    fontSize: 13,
    color: "#6b7280",
  },

  services: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 12,
  },

  viewButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 14,
  },

  viewButtonText: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  loading: {
    alignItems: "center",
    paddingVertical: 30,
  },

  loadingText: {
    marginTop: 10,
    color: "#6b7280",
  },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    alignItems: "center",
  },

  errorIcon: {
    fontSize: 25,
    marginBottom: 6,
  },

  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },

  retryText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "700",
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
  },

  contactCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 22,
  padding: 18,
  marginBottom: 20,
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
  minWidth: 0,
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

  // Help icon beside the profile icon
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  helpButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF1FF",
    borderWidth: 1,
    borderColor: "#C9D9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  helpButtonText: {
    color: "#2563EB",
    fontSize: 24,
    fontWeight: "900",
  },

  // FAQ panel
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#DCE7F8",
    elevation: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  faqHeading: {
    flex: 1,
  },

  faqTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
  },

  faqSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  faqCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  faqCloseText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700",
  },

  faqItem: {
    borderTopWidth: 1,
    borderTopColor: "#E8EEF7",
  },

  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },

  faqQuestionText: {
    flex: 1,
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginRight: 12,
  },

  faqToggle: {
    color: "#2563EB",
    fontSize: 24,
    fontWeight: "500",
  },

  faqAnswerBox: {
    backgroundColor: "#F8FAFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  faqAnswer: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 21,
  },

  faqSupport: {
    borderTopWidth: 1,
    borderTopColor: "#E8EEF7",
    marginTop: 8,
    paddingTop: 14,
  },

  faqSupportText: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 7,
  },

  faqSupportLink: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
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
});






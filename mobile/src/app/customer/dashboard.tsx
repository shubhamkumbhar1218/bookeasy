import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import API_URL from "../../api";

type Business = {
  _id?: string;
  businessName: string;
  businessSlug: string;
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
  "All",
  "Salon",
  "Barber",
  "Tutor",
  "Gym",
  "Repair Shop",
  "Hospital",
  "Beauty Parlour",
  "Other",
];

export default function CustomerDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError("");

      let url = `${API_URL}/business/search`;

      const params: string[] = [];

      if (search.trim()) {
        params.push(
          `location=${encodeURIComponent(search.trim())}`
        );
      }

      if (selectedCategory !== "All") {
        params.push(
          `category=${encodeURIComponent(
            selectedCategory
          )}`
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
          <View style={styles.businessIcon}>
            <Text style={styles.businessIconText}>
              {item.businessName
                ?.charAt(0)
                .toUpperCase()}
            </Text>
          </View>

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
            {/* Header */}

            <View style={styles.topHeader}>
              <View>
                <Text style={styles.logo}>
                  BookEasy
                </Text>

                <Text style={styles.headerSubtitle}>
                  Customer Dashboard
                </Text>
              </View>

              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>
                  👤
                </Text>
              </View>
            </View>

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
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.categoryList
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategory === item &&
                      styles.categoryButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedCategory(item)
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === item &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {item}
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
                    : `${selectedCategory} businesses`}
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
});

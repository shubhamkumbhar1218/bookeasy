import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import API_URL from "../../api";

type Service = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  averageRating?: number;
  totalReviews?: number;
};

type Business = {
  businessName: string;
  businessSlug: string;
  businessType?: string;
  phone?: string;
  address?: string;
  name?: string;
  workingHours?: Record<
    string,
    {
      open?: string;
      close?: string;
      closed?: boolean;
    }
  >;
};

export default function BusinessDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBusiness = async () => {
    try {
      setLoading(true);
      setError("");

      if (!slug) {
        setError("Business not found");
        return;
      }

      // Get business profile
      const businessResponse = await fetch(
        `${API_URL}/business/${slug}`
      );

      const businessData = await businessResponse.json();

      if (!businessResponse.ok) {
        throw new Error(
          businessData.message || "Unable to load business"
        );
      }

      setBusiness(businessData);

      // Get business services
      const businessId = businessData._id;

      if (businessId) {
        const servicesResponse = await fetch(
          `${API_URL}/services/${businessId}`
        );

        const servicesData = await servicesResponse.json();

        if (servicesResponse.ok) {
          setServices(servicesData);
        }
      }
    } catch (error) {
      console.log("Business details error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load business"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, [slug]);

  const openBooking = (service: Service) => {
    if (!business) return;

    router.push({
      pathname: "/customer/booking",
      params: {
        businessId: businessDataId,
        businessName: business.businessName,
        businessSlug: business.businessSlug,
        serviceId: service._id,
        serviceName: service.name,
        servicePrice: String(service.price),
        serviceDuration: String(service.duration),
      },
    });
  };

  const businessDataId = business
    ? (business as Business & { _id?: string })._id || ""
    : "";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading business...
        </Text>
      </View>
    );
  }

  if (error || !business) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>

        <Text style={styles.errorTitle}>
          Unable to load business
        </Text>

        <Text style={styles.errorText}>
          {error || "Business not found"}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadBusiness}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Business Details
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Business information */}
      <View style={styles.businessCard}>
        <View style={styles.businessIcon}>
          <Text style={styles.businessIconText}>
            {business.businessName
              ?.charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <Text style={styles.businessName}>
          {business.businessName}
        </Text>

        <Text style={styles.businessType}>
          {business.businessType || "Local Business"}
        </Text>

        {business.address ? (
          <Text style={styles.address}>
            📍 {business.address}
          </Text>
        ) : null}

        {business.phone ? (
          <Text style={styles.phone}>
            📞 {business.phone}
          </Text>
        ) : null}
      </View>

      {/* Services */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Services
        </Text>

        <Text style={styles.serviceCount}>
          {services.length}
        </Text>
      </View>

      {services.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            No services available
          </Text>

          <Text style={styles.emptyText}>
            This business hasn't added any services yet.
          </Text>
        </View>
      ) : (
        services.map((service) => (
          <View
            key={service._id}
            style={styles.serviceCard}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>
                {service.name}
              </Text>

              {service.description ? (
                <Text
                  style={styles.description}
                  numberOfLines={2}
                >
                  {service.description}
                </Text>
              ) : null}

              <View style={styles.serviceMeta}>
                <Text style={styles.price}>
                  ₹{service.price}
                </Text>

                <Text style={styles.duration}>
                  • {service.duration} min
                </Text>
              </View>

              {service.totalReviews &&
              service.totalReviews > 0 ? (
                <Text style={styles.rating}>
                  ⭐{" "}
                  {service.averageRating?.toFixed(1) ||
                    "0.0"}{" "}
                  ({service.totalReviews})
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => openBooking(service)}
            >
              <Text style={styles.bookButtonText}>
                Book Now
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
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

  center: {
    flex: 1,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },

  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  errorText: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  retryText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
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
    fontSize: 38,
    lineHeight: 40,
    color: "#111827",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  businessCard: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  businessIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  businessIconText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
  },

  businessName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  businessType: {
    color: "#6b7280",
    marginTop: 5,
    textTransform: "capitalize",
  },

  address: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },

  phone: {
    color: "#374151",
    fontSize: 14,
    marginTop: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  serviceCount: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: "#374151",
    fontWeight: "600",
  },

  serviceCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },

  serviceInfo: {
    flex: 1,
    paddingRight: 12,
  },

  serviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  description: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 18,
  },

  serviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  duration: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 6,
  },

  rating: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 7,
  },

  bookButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 9,
  },

  bookButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyBox: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 14,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
  },
});
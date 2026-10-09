import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
  _id: string;
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

type ServiceReview = {
  _id?: string;
  customerName: string;
  rating: number;
  review: string;
  createdAt?: string;
};

type ServiceReviewsResponse = {
  reviews: ServiceReview[];
  totalReviews: number;
  averageRating: number;
};

export default function BusinessDetailsScreen() {
  const { slug } =
    useLocalSearchParams<{ slug: string }>();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [services, setServices] =
    useState<Service[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ======================================================
  // REVIEW STATES
  // ======================================================

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [serviceReviews, setServiceReviews] =
    useState<ServiceReview[]>([]);

  const [reviewsLoading, setReviewsLoading] =
    useState(false);

  const [reviewsModalVisible, setReviewsModalVisible] =
    useState(false);

  const [reviewsSummary, setReviewsSummary] = useState({
    totalReviews: 0,
    averageRating: 0,
  });

  // ======================================================
  // LOAD BUSINESS + SERVICES + SERVICE RATINGS
  // ======================================================

  const loadBusiness = async () => {
    try {
      setLoading(true);
      setError("");

      if (!slug) {
        setError("Business not found");
        return;
      }

      // --------------------------------------------------
      // GET BUSINESS
      // --------------------------------------------------

      const businessResponse = await fetch(
        `${API_URL}/business/${slug}`
      );

      const businessData =
        await businessResponse.json();

      if (!businessResponse.ok) {
        throw new Error(
          businessData.message ||
            "Unable to load business"
        );
      }

      setBusiness(businessData);

      const businessId = businessData._id;

      if (!businessId) {
        setServices([]);
        return;
      }

      // --------------------------------------------------
      // GET SERVICES
      // --------------------------------------------------

      const servicesResponse = await fetch(
        `${API_URL}/services/${businessId}`
      );

      const servicesData =
        await servicesResponse.json();

      if (!servicesResponse.ok) {
        throw new Error(
          servicesData.message ||
            "Unable to load services"
        );
      }

      if (!Array.isArray(servicesData)) {
        setServices([]);
        return;
      }

      // --------------------------------------------------
      // GET RATING FOR EACH SERVICE
      //
      // Example:
      //
      // Chest  -> /reviews/service/CHEST_ID
      // Cardio -> /reviews/service/CARDIO_ID
      //
      // Each service gets its OWN rating.
      // --------------------------------------------------

      const servicesWithRatings =
        await Promise.all(
          servicesData.map(
            async (service: any) => {
              try {
                const reviewResponse =
                  await fetch(
                    `${API_URL}/reviews/service/${service._id}`
                  );

                if (!reviewResponse.ok) {
                  return {
                    ...service,
                    averageRating: 0,
                    totalReviews: 0,
                  };
                }

                const reviewData: ServiceReviewsResponse =
                  await reviewResponse.json();

                return {
                  ...service,

                  averageRating:
                    Number(
                      reviewData.averageRating
                    ) || 0,

                  totalReviews:
                    Number(
                      reviewData.totalReviews
                    ) || 0,
                };
              } catch (error) {
                console.log(
                  `Rating error for ${service.name}:`,
                  error
                );

                return {
                  ...service,
                  averageRating: 0,
                  totalReviews: 0,
                };
              }
            }
          )
        );

      console.log(
        "SERVICE RATINGS:",
        JSON.stringify(
          servicesWithRatings,
          null,
          2
        )
      );

      setServices(
        servicesWithRatings
      );
    } catch (error) {
      console.log(
        "Business details error:",
        error
      );

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

  // ======================================================
  // LOAD REVIEWS FOR EXACT SERVICE
  // ======================================================

  const loadServiceReviews = async (
    service: Service
  ) => {
    try {
      setReviewsLoading(true);

      setSelectedService(service);

      setReviewsModalVisible(true);

      setServiceReviews([]);

      setReviewsSummary({
        totalReviews: 0,
        averageRating: 0,
      });

      const response = await fetch(
        `${API_URL}/reviews/service/${service._id}`
      );

      const data: ServiceReviewsResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load reviews"
        );
      }

      setServiceReviews(
        data.reviews || []
      );

      setReviewsSummary({
        totalReviews:
          Number(data.totalReviews) || 0,

        averageRating:
          Number(data.averageRating) || 0,
      });
    } catch (error) {
      console.log(
        "Service reviews error:",
        error
      );

      setServiceReviews([]);

      setReviewsSummary({
        totalReviews: 0,
        averageRating: 0,
      });
    } finally {
      setReviewsLoading(false);
    }
  };

  // ======================================================
  // OPEN BOOKING
  // ======================================================

  const openBooking = (
    service: Service
  ) => {
    if (!business) return;

    router.push({
      pathname: "/customer/booking",

      params: {
        businessId: business._id,

        businessName:
          business.businessName,

        businessSlug:
          business.businessSlug,

        serviceId:
          service._id,

        serviceName:
          service.name,

        servicePrice:
          String(service.price),

        serviceDuration:
          String(service.duration),
      },
    });
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading business...
        </Text>
      </View>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error || !business) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>
          ⚠️
        </Text>

        <Text style={styles.errorTitle}>
          Unable to load business
        </Text>

        <Text style={styles.errorText}>
          {error ||
            "Business not found"}
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

  // ======================================================
  // MAIN SCREEN
  // ======================================================

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Business Details
          </Text>

          <View
            style={{ width: 40 }}
          />
        </View>

        {/* BUSINESS INFORMATION */}

        <View
          style={styles.businessCard}
        >
          <View
            style={styles.businessIcon}
          >
            <Text
              style={
                styles.businessIconText
              }
            >
              {business.businessName
                ?.charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <Text
            style={styles.businessName}
          >
            {business.businessName}
          </Text>

          <Text
            style={styles.businessType}
          >
            {business.businessType ||
              "Local Business"}
          </Text>

          {business.address ? (
            <Text
              style={styles.address}
            >
              📍 {business.address}
            </Text>
          ) : null}

          {business.phone ? (
            <Text
              style={styles.phone}
            >
              📞 {business.phone}
            </Text>
          ) : null}
        </View>

        {/* SERVICES HEADER */}

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={styles.sectionTitle}
          >
            Services
          </Text>

          <Text
            style={styles.serviceCount}
          >
            {services.length}
          </Text>
        </View>

        {/* SERVICES */}

        {services.length === 0 ? (
          <View
            style={styles.emptyBox}
          >
            <Text
              style={styles.emptyTitle}
            >
              No services available
            </Text>

            <Text
              style={styles.emptyText}
            >
              This business hasn't added
              any services yet.
            </Text>
          </View>
        ) : (
          services.map(
            (service) => (
              <View
                key={service._id}
                style={
                  styles.serviceCard
                }
              >
                <View
                  style={
                    styles.serviceInfo
                  }
                >
                  {/* SERVICE NAME */}

                  <Text
                    style={
                      styles.serviceName
                    }
                  >
                    {service.name}
                  </Text>

                  {/* DESCRIPTION */}

                  {service.description ? (
                    <Text
                      style={
                        styles.description
                      }
                      numberOfLines={2}
                    >
                      {service.description}
                    </Text>
                  ) : null}

                  {/* PRICE + DURATION */}

                  <View
                    style={
                      styles.serviceMeta
                    }
                  >
                    <Text
                      style={
                        styles.price
                      }
                    >
                      ₹{service.price}
                    </Text>

                    <Text
                      style={
                        styles.duration
                      }
                    >
                      • {service.duration} min
                    </Text>
                  </View>

                  {/* SERVICE-SPECIFIC RATING */}

                  {Number(
                    service.totalReviews
                  ) > 0 ? (
                    <TouchableOpacity
                      onPress={() =>
                        loadServiceReviews(
                          service
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={
                          styles.rating
                        }
                      >
                        ⭐{" "}
                        {Number(
                          service.averageRating ||
                            0
                        ).toFixed(1)}{" "}
                        (
                        {
                          service.totalReviews
                        }
                        ) • View Reviews
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={
                        styles.noRating
                      }
                    >
                      No reviews yet
                    </Text>
                  )}
                </View>

                {/* BOOK BUTTON */}

                <TouchableOpacity
                  style={
                    styles.bookButton
                  }
                  onPress={() =>
                    openBooking(service)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      styles.bookButtonText
                    }
                  >
                    Book Now
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )
        )}
      </ScrollView>

      {/* REVIEWS MODAL */}

      <Modal
        visible={
          reviewsModalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setReviewsModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContainer
            }
          >
            {/* MODAL HEADER */}

            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalHeaderInfo
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                  numberOfLines={1}
                >
                  {selectedService?.name ||
                    "Reviews"}
                </Text>

                <Text
                  style={
                    styles.modalSummary
                  }
                >
                  ⭐{" "}
                  {reviewsSummary.averageRating.toFixed(
                    1
                  )}{" "}
                  •{" "}
                  {
                    reviewsSummary.totalReviews
                  }{" "}
                  reviews
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={() =>
                  setReviewsModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* REVIEWS */}

            {reviewsLoading ? (
              <View
                style={
                  styles.reviewsLoading
                }
              >
                <ActivityIndicator
                  size="large"
                />

                <Text
                  style={
                    styles.reviewsLoadingText
                  }
                >
                  Loading reviews...
                </Text>
              </View>
            ) : serviceReviews.length ===
              0 ? (
              <View
                style={
                  styles.noReviewsBox
                }
              >
                <Text
                  style={
                    styles.noReviewsIcon
                  }
                >
                  ⭐
                </Text>

                <Text
                  style={
                    styles.noReviewsTitle
                  }
                >
                  No reviews yet
                </Text>

                <Text
                  style={
                    styles.noReviewsText
                  }
                >
                  This service doesn't
                  have any reviews yet.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={
                  styles.reviewsList
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                {serviceReviews.map(
                  (
                    review,
                    index
                  ) => (
                    <View
                      key={
                        review._id ||
                        `${review.customerName}-${index}`
                      }
                      style={
                        styles.reviewCard
                      }
                    >
                      <View
                        style={
                          styles.reviewTop
                        }
                      >
                        <Text
                          style={
                            styles.customerName
                          }
                        >
                          {
                            review.customerName
                          }
                        </Text>

                        <Text
                          style={
                            styles.reviewRating
                          }
                        >
                          ⭐{" "}
                          {
                            review.rating
                          }
                          /5
                        </Text>
                      </View>

                      {review.review ? (
                        <Text
                          style={
                            styles.reviewText
                          }
                        >
                          {
                            review.review
                          }
                        </Text>
                      ) : null}

                      {review.createdAt ? (
                        <Text
                          style={
                            styles.reviewDate
                          }
                        >
                          {new Date(
                            review.createdAt
                          ).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                  )
                )}
              </ScrollView>
            )}

            {/* CLOSE */}

            <TouchableOpacity
              style={
                styles.doneButton
              }
              onPress={() =>
                setReviewsModalVisible(
                  false
                )
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.doneButtonText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ==========================================================
// STYLES
// ==========================================================

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

  noRating: {
    fontSize: 12,
    color: "#9ca3af",
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

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "85%",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  modalHeaderInfo: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  modalSummary: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 5,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: 17,
    color: "#374151",
    fontWeight: "700",
  },

  reviewsLoading: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  reviewsLoadingText: {
    marginTop: 10,
    color: "#6b7280",
  },

  reviewsList: {
    marginTop: 12,
  },

  reviewCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },

  reviewRating: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  reviewText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginTop: 8,
  },

  reviewDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 8,
  },

  noReviewsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 55,
  },

  noReviewsIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  noReviewsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  noReviewsText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
  },

  doneButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
  },

  doneButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
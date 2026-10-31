
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../api";

type Program = {
  name: string;
  isActive: boolean;
  visitsRequired: number;
  rewardType: "fixed" | "percentage";
  rewardValue: number;
  rewardExpiryDays: number | null;
};

type Customer = {
  _id: string;
  customerName: string;
  customerPhone: string;
  completedVisits: number;
  lifetimeVisits: number;
  totalRewardsEarned: number;
  totalRewardsRedeemed: number;
};

type Reward = {
  _id: string;
  customerPhone: string;
  rewardType: "fixed" | "percentage";
  rewardValue: number;
  status: "available" | "redeemed" | "expired";
  earnedAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
};

type RewardFilter = "available" | "redeemed" | "expired";

const DEFAULT_PROGRAM: Program = {
  name: "Royaltoi Rewards",
  isActive: false,
  visitsRequired: 5,
  rewardType: "fixed",
  rewardValue: 100,
  rewardExpiryDays: null,
};

export default function LoyaltyScreen() {
  const [program, setProgram] = useState<Program>(DEFAULT_PROGRAM);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filter, setFilter] = useState<RewardFilter>("available");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const [token, setToken] = useState("");

const request = async (
  path: string,
  options: RequestInit = {},
  authToken?: string
) => {
  const savedToken =
    authToken || token || await AsyncStorage.getItem("bookeasy_token");

  if (!savedToken) {
    router.replace("/business/login");
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_URL}/loyalty${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${savedToken}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    await AsyncStorage.multiRemove([
      "bookeasy_token",
      "bookeasy_user",
      "bookeasy_role",
    ]);
    router.replace("/business/login");
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
};

  const loadData = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem("bookeasy_token");

      if (!savedToken) {
        router.replace("/business/login");
        return;
      }

      setToken(savedToken);

const [programData, customerData, rewardData] = await Promise.all([
  request("/program", {}, savedToken),
  request("/customers", {}, savedToken),
  request(`/rewards?status=${filter}`, {}, savedToken),
]);

      setProgram({
        ...DEFAULT_PROGRAM,
        ...(programData.program || {}),
      });

      setCustomers(
        Array.isArray(customerData.customers)
          ? customerData.customers
          : []
      );

      setRewards(
        Array.isArray(rewardData.rewards)
          ? rewardData.rewards
          : []
      );
    } catch (error: any) {
      Alert.alert("Royaltoi Rewards", error.message || "Unable to load loyalty data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const updateProgram = (changes: Partial<Program>) => {
    setProgram((previous) => ({
      ...previous,
      ...changes,
    }));
  };

  const saveProgram = async () => {
    const visits = Number(program.visitsRequired);
    const value = Number(program.rewardValue);
    const expiry = program.rewardExpiryDays;

    if (!program.name.trim()) {
      Alert.alert("Invalid name", "Enter a loyalty program name.");
      return;
    }

    if (!Number.isInteger(visits) || visits < 2 || visits > 100) {
      Alert.alert("Invalid visits", "Visits required must be between 2 and 100.");
      return;
    }

    if (!Number.isFinite(value) || value < 1) {
      Alert.alert("Invalid reward", "Enter a reward value greater than zero.");
      return;
    }

    if (program.rewardType === "percentage" && value > 100) {
      Alert.alert("Invalid percentage", "Percentage cannot exceed 100.");
      return;
    }

    if (
      expiry !== null &&
      (!Number.isInteger(expiry) || expiry < 1 || expiry > 3650)
    ) {
      Alert.alert("Invalid expiry", "Expiry must be between 1 and 3650 days, or disabled.");
      return;
    }

    setSaving(true);

    try {
      const data = await request("/program", {
        method: "PUT",
        body: JSON.stringify({
          name: program.name.trim(),
          isActive: program.isActive,
          visitsRequired: visits,
          rewardType: program.rewardType,
          rewardValue: value,
          rewardExpiryDays: expiry,
        }),
      });

      setProgram({
        ...DEFAULT_PROGRAM,
        ...data.program,
      });

      Alert.alert("Saved", "Royaltoi Rewards settings saved successfully.");
    } catch (error: any) {
      Alert.alert("Unable to save", error.message);
    } finally {
      setSaving(false);
    }
  };

  const redeemReward = (reward: Reward) => {
    Alert.alert(
      "Redeem reward?",
      `Confirm that this customer's reward is being redeemed.\n\nCustomer: ${reward.customerPhone}\nReward: ${
        reward.rewardType === "percentage"
          ? `${reward.rewardValue}%`
          : `₹${reward.rewardValue}`
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm redemption",
          onPress: async () => {
            setRedeemingId(reward._id);

            try {
              await request(`/rewards/${reward._id}/redeem`, {
                method: "PATCH",
              });

              Alert.alert("Success", "Reward marked as redeemed.");

              await loadData();
            } catch (error: any) {
              Alert.alert("Redemption failed", error.message);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return "No expiry";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "Not available";

    return parsed.toLocaleDateString("en-IN");
  };

  const rewardLabel = (reward: Reward) =>
    reward.rewardType === "percentage"
      ? `${reward.rewardValue}% discount`
      : `₹${reward.rewardValue} discount`;

if (loading) {
  return (
    <View style={styles.loadingScreen}>
      <View style={styles.loadingIcon}>
        <Text style={styles.loadingEmoji}>✦</Text>
      </View>

      <ActivityIndicator size="large" color="#B18D50" />

      <Text style={styles.loadingTitle}>Royaltoi Rewards</Text>
      <Text style={styles.loadingSubtitle}>
        Preparing your loyalty dashboard...
      </Text>
    </View>
  );
}



  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData();
            }}
            tintColor="#C49A54"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.back}>‹</Text>
            <Text style={styles.backLabel}>Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandEmoji}>✦</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>ROYALTOI</Text>
              <Text style={styles.brandSubtitle}>CUSTOMER LOYALTY</Text>
            </View>
          </View>

          <Text style={styles.heading}>Rewards & Loyalty</Text>
          <Text style={styles.subtitle}>
            Make every customer visit more rewarding.
          </Text>
        </View>

        {/* PROGRAM OVERVIEW */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewEyebrow}>YOUR LOYALTY PROGRAM</Text>
              <Text style={styles.overviewName}>{program.name || "Royaltoi Rewards"}</Text>
            </View>

            <View
              style={[
                styles.statusPill,
                program.isActive ? styles.statusEnabled : styles.statusPaused,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  program.isActive
                    ? styles.statusDotEnabled
                    : styles.statusDotPaused,
                ]}
              />
              <Text style={styles.statusPillText}>
                {program.isActive ? "Enabled" : "Paused"}
              </Text>
            </View>
          </View>

          <View style={styles.overviewDivider} />

          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>
                {program.visitsRequired}
              </Text>
              <Text style={styles.overviewStatLabel}>Visits required</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>
                {program.rewardType === "percentage"
                  ? `${program.rewardValue}%`
                  : `₹${program.rewardValue}`}
              </Text>
              <Text style={styles.overviewStatLabel}>Customer reward</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>
                {customers.length}
              </Text>
              <Text style={styles.overviewStatLabel}>Loyal customers</Text>
            </View>
          </View>

          <Text style={styles.overviewHint}>
            {program.isActive
              ? "Your customers can earn rewards on completed visits."
              : "Your program is paused. Existing rewards remain available."}
          </Text>
        </View>

        {/* PROGRAM SETTINGS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>⚙</Text>
            </View>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Program settings</Text>
              <Text style={styles.sectionSubtitle}>
                Customize your customer rewards
              </Text>
            </View>
          </View>

          <Text style={styles.label}>PROGRAM NAME</Text>
          <TextInput
            style={styles.input}
            value={program.name}
            onChangeText={(value) => updateProgram({ name: value })}
            maxLength={80}
            placeholder="Royaltoi Rewards"
            placeholderTextColor="#A39D90"
          />

          <View style={styles.settingStatusRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Loyalty program status</Text>
              <Text style={styles.settingDescription}>
                {program.isActive
                  ? "Customers are earning visits"
                  : "New visits are currently paused"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.statusButton,
                program.isActive
                  ? styles.statusButtonActive
                  : styles.statusButtonInactive,
              ]}
              onPress={() =>
                updateProgram({ isActive: !program.isActive })
              }
            >
              <Text
                style={[
                  styles.statusButtonText,
                  program.isActive && styles.statusButtonTextActive,
                ]}
              >
                {program.isActive ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldDivider} />

          <Text style={styles.label}>VISITS NEEDED FOR A REWARD</Text>
          <Text style={styles.fieldHint}>
            How many completed bookings unlock a reward?
          </Text>
          <TextInput
            style={styles.input}
            value={String(program.visitsRequired)}
            onChangeText={(value) =>
              updateProgram({
                visitsRequired: value === "" ? 0 : Number(value),
              })
            }
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor="#A39D90"
          />

          <Text style={styles.label}>REWARD TYPE</Text>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.segment,
                program.rewardType === "fixed" && styles.segmentSelected,
              ]}
              onPress={() => updateProgram({ rewardType: "fixed" })}
            >
              <Text
                style={[
                  styles.segmentText,
                  program.rewardType === "fixed" && styles.segmentTextSelected,
                ]}
              >
                ₹ Fixed amount
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.segment,
                program.rewardType === "percentage" && styles.segmentSelected,
              ]}
              onPress={() => updateProgram({ rewardType: "percentage" })}
            >
              <Text
                style={[
                  styles.segmentText,
                  program.rewardType === "percentage" &&
                    styles.segmentTextSelected,
                ]}
              >
                % Percentage
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            REWARD VALUE ({program.rewardType === "fixed" ? "₹" : "%"})
          </Text>
          <TextInput
            style={styles.input}
            value={String(program.rewardValue)}
            onChangeText={(value) =>
              updateProgram({
                rewardValue: value === "" ? 0 : Number(value),
              })
            }
            keyboardType="decimal-pad"
            placeholder="100"
            placeholderTextColor="#A39D90"
          />

          <Text style={styles.label}>REWARD EXPIRY</Text>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.segment,
                program.rewardExpiryDays === null && styles.segmentSelected,
              ]}
              onPress={() => updateProgram({ rewardExpiryDays: null })}
            >
              <Text
                style={[
                  styles.segmentText,
                  program.rewardExpiryDays === null &&
                    styles.segmentTextSelected,
                ]}
              >
                No expiry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.segment,
                program.rewardExpiryDays !== null && styles.segmentSelected,
              ]}
              onPress={() =>
                updateProgram({
                  rewardExpiryDays: program.rewardExpiryDays ?? 30,
                })
              }
            >
              <Text
                style={[
                  styles.segmentText,
                  program.rewardExpiryDays !== null &&
                    styles.segmentTextSelected,
                ]}
              >
                Set expiry
              </Text>
            </TouchableOpacity>
          </View>

          {program.rewardExpiryDays !== null && (
            <>
              <Text style={styles.label}>EXPIRY DAYS</Text>
              <TextInput
                style={styles.input}
                value={String(program.rewardExpiryDays)}
                onChangeText={(value) =>
                  updateProgram({
                    rewardExpiryDays: value === "" ? 0 : Number(value),
                  })
                }
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor="#A39D90"
              />
            </>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.saveButton,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={saveProgram}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save changes</Text>
                <Text style={styles.saveArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            Saving requires an active Premium subscription. Pausing the
            program stops new visits from earning rewards. Previously earned
            rewards remain available according to their expiry.
          </Text>
        </View>

        {/* CUSTOMER PROGRESS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>♙</Text>
            </View>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Customer progress</Text>
              <Text style={styles.sectionSubtitle}>
                Track your returning customers
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{customers.length}</Text>
            </View>
          </View>

          {customers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>♧</Text>
              <Text style={styles.emptyTitle}>No loyalty customers yet</Text>
              <Text style={styles.empty}>
                Completed customer bookings will appear here when they earn
                loyalty visits.
              </Text>
            </View>
          ) : (
            customers.map((customer) => {
              const progressPercent = Math.min(
                100,
                Math.max(
                  0,
                  (customer.completedVisits / Math.max(1, program.visitsRequired)) *
                    100
                )
              );

              return (
                <View key={customer._id} style={styles.customerCard}>
                  <View style={styles.customerTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(customer.customerName || "C")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.customerIdentity}>
                      <Text style={styles.customerName}>
                        {customer.customerName || "Customer"}
                      </Text>
                      <Text style={styles.customerPhone}>
                        {customer.customerPhone}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressInfo}>
                    <Text style={styles.progressLabel}>Visit progress</Text>
                    <Text style={styles.progressCount}>
                      {customer.completedVisits} / {program.visitsRequired}
                    </Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progressPercent}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.customerStats}>
                    <Text style={styles.customerStat}>
                      {customer.lifetimeVisits} lifetime visits
                    </Text>
                    <Text style={styles.customerStat}>
                      {customer.totalRewardsEarned} rewards earned
                    </Text>
                    <Text style={styles.customerStat}>
                      {customer.totalRewardsRedeemed} redeemed
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* REWARD HISTORY */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>✧</Text>
            </View>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Reward history</Text>
              <Text style={styles.sectionSubtitle}>
                Manage customer rewards
              </Text>
            </View>
          </View>

          <View style={styles.filterContainer}>
            {(["available", "redeemed", "expired"] as RewardFilter[]).map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.8}
                  style={[
                    styles.filterButton,
                    filter === status && styles.filterButtonSelected,
                  ]}
                  onPress={() => setFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === status && styles.filterTextSelected,
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✧</Text>
              <Text style={styles.emptyTitle}>No {filter} rewards</Text>
              <Text style={styles.empty}>
                Rewards in this category will appear here.
              </Text>
            </View>
          ) : (
            rewards.map((reward) => (
              <View key={reward._id} style={styles.rewardCard}>
                <View style={styles.rewardTop}>
                  <View style={styles.rewardIcon}>
                    <Text style={styles.rewardIconText}>✦</Text>
                  </View>

                  <View style={styles.rewardDetails}>
                    <Text style={styles.rewardValue}>
                      {rewardLabel(reward)}
                    </Text>
                    <Text style={styles.rewardPhone}>
                      {reward.customerPhone}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.rewardStatus,
                      reward.status === "available" && styles.rewardAvailable,
                      reward.status === "redeemed" && styles.rewardRedeemed,
                      reward.status === "expired" && styles.rewardExpired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rewardStatusText,
                        reward.status === "available" &&
                          styles.rewardAvailableText,
                        reward.status === "redeemed" &&
                          styles.rewardRedeemedText,
                        reward.status === "expired" &&
                          styles.rewardExpiredText,
                      ]}
                    >
                      {reward.status.charAt(0).toUpperCase() +
                        reward.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rewardDateRow}>
                  <View style={styles.rewardDateItem}>
                    <Text style={styles.rewardDateLabel}>EARNED</Text>
                    <Text style={styles.rewardDateValue}>
                      {formatDate(reward.earnedAt)}
                    </Text>
                  </View>

                  <View style={styles.rewardDateItem}>
                    <Text style={styles.rewardDateLabel}>
                      {reward.status === "redeemed" ? "REDEEMED" : "EXPIRES"}
                    </Text>
                    <Text style={styles.rewardDateValue}>
                      {reward.status === "redeemed"
                        ? formatDate(reward.redeemedAt)
                        : formatDate(reward.expiresAt)}
                    </Text>
                  </View>
                </View>

                {reward.status === "available" && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.redeemButton}
                    disabled={redeemingId === reward._id}
                    onPress={() => redeemReward(reward)}
                  >
                    {redeemingId === reward._id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.redeemButtonText}>
                        Confirm redemption  →
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>ROYALTOI REWARDS</Text>
          <Text style={styles.footerNote}>
            Reward redemption records the redemption in BookEasy. It does not
            automatically change a booking price or process a payment discount.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F4ED",
  },
  content: {
    padding: 18,
    paddingBottom: 42,
  },
  header: {
    marginBottom: 22,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 25,
  },
  back: {
    fontSize: 28,
    color: "#29463A",
    marginRight: 7,
    fontWeight: "500",
  },
  backLabel: {
    color: "#536B5D",
    fontSize: 13,
    fontWeight: "700",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#29463A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },
  brandEmoji: {
    color: "#E4C58C",
    fontSize: 24,
  },
  brandText: {
    justifyContent: "center",
  },
  brandName: {
    color: "#29463A",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
  },
  brandSubtitle: {
    color: "#A18451",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 3,
  },
  heading: {
    color: "#263E33",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#7C8276",
    fontSize: 13,
    marginTop: 7,
    lineHeight: 20,
  },
  overviewCard: {
    backgroundColor: "#29463A",
    padding: 20,
    borderRadius: 22,
    marginBottom: 18,
    overflow: "hidden",
  },
  overviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  overviewEyebrow: {
    color: "#D5BB8D",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  overviewName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 8,
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusEnabled: {
    backgroundColor: "#D8E9D8",
  },
  statusPaused: {
    backgroundColor: "#E8E3D7",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    marginRight: 6,
  },
  statusDotEnabled: {
    backgroundColor: "#27804D",
  },
  statusDotPaused: {
    backgroundColor: "#A18451",
  },
  statusPillText: {
    color: "#29463A",
    fontSize: 10,
    fontWeight: "800",
  },
  overviewDivider: {
    height: 1,
    backgroundColor: "#FFFFFF",
    opacity: 0.15,
    marginVertical: 19,
  },
  overviewStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewStat: {
    flex: 1,
    alignItems: "center",
  },
  overviewStatValue: {
    color: "#F1D6A5",
    fontSize: 20,
    fontWeight: "900",
  },
  overviewStatLabel: {
    color: "#D2D8CF",
    fontSize: 9,
    marginTop: 5,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#FFFFFF",
    opacity: 0.2,
  },
  overviewHint: {
    color: "#D5DFD5",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 19,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: "#EAE7DC",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#F2EFE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  sectionIconText: {
    color: "#9B7A42",
    fontSize: 20,
    fontWeight: "800",
  },
  sectionHeadingWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#29463A",
  },
  sectionSubtitle: {
    color: "#92958A",
    fontSize: 11,
    marginTop: 4,
  },
  label: {
    color: "#8D7958",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 19,
    marginBottom: 8,
  },
  fieldHint: {
    color: "#96988F",
    fontSize: 11,
    marginBottom: 9,
    marginTop: -3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7E5DA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#29463A",
    fontSize: 14,
    backgroundColor: "#FBFAF6",
  },
  settingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 21,
  },
  settingTitle: {
    color: "#29463A",
    fontSize: 13,
    fontWeight: "800",
  },
  settingDescription: {
    color: "#8A9187",
    fontSize: 11,
    marginTop: 4,
  },
  statusButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 65,
    alignItems: "center",
  },
  statusButtonActive: {
    backgroundColor: "#29463A",
  },
  statusButtonInactive: {
    backgroundColor: "#EFEDE6",
  },
  statusButtonText: {
    color: "#77776D",
    fontSize: 11,
    fontWeight: "900",
  },
  statusButtonTextActive: {
    color: "#FFFFFF",
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "#F0EEE7",
    marginTop: 20,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F3EC",
    borderRadius: 12,
    padding: 4,
    gap: 5,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 9,
  },
  segmentSelected: {
    backgroundColor: "#29463A",
  },
  segmentText: {
    color: "#77796F",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  segmentTextSelected: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#29463A",
    padding: 16,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 25,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  saveArrow: {
    color: "#E4C58C",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 10,
  },
  note: {
    color: "#99988D",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 13,
  },
  countBadge: {
    backgroundColor: "#F2EFE5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  countBadgeText: {
    color: "#947642",
    fontSize: 12,
    fontWeight: "900",
  },
  customerCard: {
    backgroundColor: "#FBFAF6",
    borderRadius: 15,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#EFEEE7",
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#E8EBDD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },
  avatarText: {
    color: "#29463A",
    fontSize: 16,
    fontWeight: "900",
  },
  customerIdentity: {
    flex: 1,
  },
  customerName: {
    color: "#29463A",
    fontSize: 13,
    fontWeight: "900",
  },
  customerPhone: {
    color: "#90958B",
    fontSize: 11,
    marginTop: 4,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 8,
  },
  progressLabel: {
    color: "#777D72",
    fontSize: 11,
    fontWeight: "700",
  },
  progressCount: {
    color: "#A17E42",
    fontSize: 11,
    fontWeight: "900",
  },
  progressTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#E9E9DF",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#B18D50",
  },
  customerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },
  customerStat: {
    color: "#7C8277",
    fontSize: 9,
    backgroundColor: "#F0EFE7",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F3EC",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 9,
  },
  filterButtonSelected: {
    backgroundColor: "#29463A",
  },
  filterText: {
    color: "#85877D",
    fontSize: 10,
    fontWeight: "800",
  },
  filterTextSelected: {
    color: "#FFFFFF",
  },
  rewardCard: {
    borderWidth: 1,
    borderColor: "#EAE8DE",
    borderRadius: 15,
    padding: 14,
    marginBottom: 11,
    backgroundColor: "#FFFEFB",
  },
  rewardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#F3EBD9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rewardIconText: {
    color: "#A17E42",
    fontSize: 19,
  },
  rewardDetails: {
    flex: 1,
  },
  rewardValue: {
    color: "#29463A",
    fontSize: 14,
    fontWeight: "900",
  },
  rewardPhone: {
    color: "#92948A",
    fontSize: 10,
    marginTop: 4,
  },
  rewardStatus: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rewardAvailable: {
    backgroundColor: "#E5F1E6",
  },
  rewardRedeemed: {
    backgroundColor: "#E9EDF4",
  },
  rewardExpired: {
    backgroundColor: "#F8E8E5",
  },
  rewardStatusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  rewardAvailableText: {
    color: "#34764A",
  },
  rewardRedeemedText: {
    color: "#526987",
  },
  rewardExpiredText: {
    color: "#B35C50",
  },
  rewardDateRow: {
    flexDirection: "row",
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F0EEE7",
  },
  rewardDateItem: {
    flex: 1,
  },
  rewardDateLabel: {
    color: "#A39A86",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  rewardDateValue: {
    color: "#626E62",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  redeemButton: {
    backgroundColor: "#29463A",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
    marginTop: 15,
  },
  redeemButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyIcon: {
    color: "#B18D50",
    fontSize: 30,
    marginBottom: 9,
  },
  emptyTitle: {
    color: "#29463A",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  empty: {
    color: "#92958B",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 5,
  },
  footerBrand: {
    color: "#A18451",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  footerNote: {
    color: "#99998E",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },


  loadingScreen: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#F6F4ED",
},
loadingIcon: {
  width: 58,
  height: 58,
  borderRadius: 18,
  backgroundColor: "#29463A",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 20,
},
loadingEmoji: {
  color: "#E4C58C",
  fontSize: 30,
},
loadingTitle: {
  color: "#29463A",
  fontSize: 17,
  fontWeight: "900",
  marginTop: 16,
},
loadingSubtitle: {
  color: "#92958A",
  fontSize: 12,
  marginTop: 7,
},
});

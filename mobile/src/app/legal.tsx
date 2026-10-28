
import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

const BOOKEASY_EMAIL = "support.bookeasy@gmail.com";
const BOOKEASY_PHONE = "+919022284532";

const openContactLink = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        "Unable to open",
        "No compatible app was found to complete this action."
      );
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Something went wrong",
      "Please try again or contact BookEasy using another method."
    );
  }
};

const policies = {
  terms: {
    title: "Terms & Conditions",
    sections: [
      [
        "About BookEasy",
        "BookEasy provides online booking and business-management tools for businesses and their customers. Features may vary by subscription plan.",
      ],
      [
        "Accounts",
        "Users must provide accurate information, protect their login credentials, and notify BookEasy of suspected unauthorized access.",
      ],
      [
        "Subscriptions and payments",
        "Plan prices, billing periods, limits, and features are displayed before purchase. Payments may be processed by third-party payment providers.",
      ],
      [
        "Bookings",
        "Businesses are responsible for their service listings, prices, availability, and fulfillment of appointments. Customers should provide accurate booking details.",
      ],
      [
        "Acceptable use",
        "You must not misuse BookEasy, attempt unauthorized access, submit fraudulent information, or violate applicable law.",
      ],
      [
        "Availability",
        "BookEasy may maintain, update, or modify features when reasonably necessary. Uninterrupted service is not guaranteed.",
      ],
      [
        "Liability",
        "To the extent permitted by applicable law, BookEasy is not responsible for disputes between customers and independent businesses. Rights that cannot legally be excluded remain unaffected.",
      ],
      [
        "Contact",
        "For questions about these terms, contact BookEasy Management using the contact options below.",
      ],
    ],
  },

  privacy: {
    title: "Privacy Policy",
    sections: [
      [
        "Information collected",
        "Depending on how you use BookEasy, information may include account details, contact information, business listings, appointment details, payment references, and technical data.",
      ],
      [
        "How information is used",
        "Information is used to operate bookings, manage accounts and subscriptions, provide support, improve security, and meet legal obligations.",
      ],
      [
        "Payments",
        "Third-party payment providers process payments under their own privacy practices. BookEasy may receive transaction references and payment status.",
      ],
      [
        "Sharing",
        "Information may be shared with the business involved in a booking, service providers supporting BookEasy, or authorities where required by law.",
      ],
      [
        "Security and retention",
        "Reasonable safeguards are used to protect information. Records may be retained as needed for service operation, dispute resolution, and legal obligations.",
      ],
      [
        "Your choices",
        "You may contact BookEasy to request access, correction, or deletion of personal information where applicable law provides that right.",
      ],
      [
        "Sensitive information",
        "Avoid entering unnecessary medical or other sensitive information into booking fields. Do not use booking fields to store sensitive information unless the feature is specifically intended for it.",
      ],
      [
        "Updates and contact",
        "This policy may be updated from time to time. For privacy questions, contact BookEasy Management using the contact options below.",
      ],
    ],
  },

  refund: {
    title: "Cancellation & Refund Policy",
    sections: [
      [
        "Scope",
        "This policy covers BookEasy subscription payments. Appointments and services provided by independent businesses are subject to the relevant business's own policies.",
      ],
      [
        "Subscription cancellation",
        "You may request cancellation through available account or payment-provider options, or by contacting BookEasy support. Cancellation does not automatically mean a refund will be issued.",
      ],
      [
        "Requesting a refund",
        "Contact BookEasy using the email or phone number below. Include your registered account email, payment date, transaction reference, amount, and reason when relevant. Never send passwords, OTPs, or full card details.",
      ],
      [
        "Review",
        "Refund requests are reviewed individually. Verified duplicate charges, payment errors, or other circumstances may warrant review. Applicable legal rights remain unaffected.",
      ],
      [
        "Manual processing",
        "BookEasy does not currently offer an automated in-app refund facility. If a refund is approved, it is processed manually through the relevant payment provider, such as the Razorpay Dashboard when applicable.",
      ],
      [
        "Processing time",
        "The time for an approved refund to appear depends on the payment provider, payment method, and bank. A request does not guarantee approval.",
      ],
      [
        "Contact",
        "For cancellation or refund requests, contact BookEasy Management using the contact options below.",
      ],
    ],
  },
};

type PolicyKey = keyof typeof policies;

export default function LegalScreen() {
  const [selected, setSelected] = useState<PolicyKey>("terms");
  const policy = policies[selected];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.brand}>BookEasy</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>BOOKEASY · LEGAL</Text>
        <Text style={styles.heading}>Policies</Text>

        <View style={styles.tabs}>
          {(
            [
              ["terms", "Terms"],
              ["privacy", "Privacy"],
              ["refund", "Refunds"],
            ] as [PolicyKey, string][]
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tab,
                selected === key && styles.activeTab,
              ]}
              onPress={() => setSelected(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === key }}
            >
              <Text
                style={[
                  styles.tabText,
                  selected === key && styles.activeTabText,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.policyTitle}>{policy.title}</Text>
          <Text style={styles.updated}>
            Last updated: 28 October 2026
          </Text>

          {policy.sections.map(([title, body]) => (
            <View key={title} style={styles.section}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
          ))}
        </View>

        {/* BookEasy management contact details */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>
            Contact BookEasy Management
          </Text>

          <Text style={styles.contactDescription}>
            Need help with your account, booking, subscription, or refund?
            Get in touch with our management team.
          </Text>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() =>
              openContactLink(`mailto:${BOOKEASY_EMAIL}`)
            }
            accessibilityRole="button"
            accessibilityLabel={`Email BookEasy at ${BOOKEASY_EMAIL}`}
          >
            <Text style={styles.emailIcon}>✉</Text>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactButtonTitle}>Email Us</Text>
              <Text style={styles.contactValue}>
                {BOOKEASY_EMAIL}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() =>
              openContactLink(`tel:${BOOKEASY_PHONE}`)
            }
            accessibilityRole="button"
            accessibilityLabel="Call BookEasy Management"
          >
            <Text style={styles.phoneIcon}>☎</Text>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactButtonTitle}>Call Us</Text>
              <Text style={styles.contactValue}>
                +91 9022284532
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          These policies are general templates and should be reviewed
          for legal compliance before publication.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  back: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },
  brand: {
    color: "#2563eb",
    fontSize: 18,
    fontWeight: "800",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 8,
    marginBottom: 18,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#2563eb",
  },
  tabText: {
    color: "#334155",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  policyTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#0f172a",
  },
  updated: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  contactCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#ffffff",
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  contactDescription: {
    marginTop: 8,
    marginBottom: 8,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  emailIcon: {
    fontSize: 23,
    color: "#2563eb",
    marginRight: 12,
  },
  phoneIcon: {
    fontSize: 23,
    color: "#2563eb",
    marginRight: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactButtonTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  contactValue: {
    marginTop: 3,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  note: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
});

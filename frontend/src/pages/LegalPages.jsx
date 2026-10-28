import React from "react";
import { Link, useLocation } from "react-router-dom";

const policies = {
  "/terms": {
    title: "Terms & Conditions",
    updated: "28 October 2026",
    sections: [
      ["1. About BookEasy", "BookEasy provides online booking and business-management tools for businesses and their customers. Features may vary according to the selected subscription plan."],
      ["2. Accounts", "You must provide accurate registration details, protect your login credentials, and notify us if you suspect unauthorized account access."],
      ["3. Subscription plans and payments", "BookEasy offers free and paid plans. Plan prices, billing periods, usage limits, and available features are displayed on the subscription page before purchase. Applicable taxes, if any, will be disclosed as required by law."],
      ["4. Cancellation and refunds", "Subscription cancellation and refund requests are governed by our Cancellation & Refund Policy. A cancellation does not automatically mean that a payment will be refunded."],
      ["5. Business responsibilities", "Businesses are responsible for the accuracy of their service listings, prices, availability, customer communications, and fulfillment of appointments."],
      ["6. Customer bookings", "Customers should provide accurate booking information and contact the relevant business regarding appointment changes, cancellations, or service disputes."],
      ["7. Acceptable use", "You must not misuse the platform, attempt unauthorized access, submit fraudulent information, or use BookEasy in violation of applicable law."],
      ["8. Availability and changes", "We may update, maintain, suspend, or modify platform features when reasonably necessary. We do not guarantee uninterrupted service."],
      ["9. Third-party services", "Payments and certain other features may depend on third-party providers and their terms. Their processing and availability may be outside BookEasy's control."],
      ["10. Liability", "To the extent permitted by applicable law, BookEasy is not responsible for disputes between customers and independent businesses or for indirect losses arising from use of the platform. Nothing in these terms excludes liability that cannot legally be excluded."],
      ["11. Governing law", "These terms are subject to the laws of India, subject to applicable consumer-protection and other mandatory legal requirements."],
      ["12. Contact", "For questions about these terms, contact BookEasy using the official support contact published on our website."]
    ]
  },
  "/privacy": {
    title: "Privacy Policy",
    updated: "28 October 2026",
    sections: [
      ["1. Information we collect", "Depending on how you use BookEasy, we may collect account and contact details, business information, service listings, appointment details, subscription and payment references, and technical information needed to operate and secure the platform."],
      ["2. How we use information", "We use information to provide bookings and business tools, manage accounts and subscriptions, communicate service updates, provide support, prevent misuse, and meet legal obligations."],
      ["3. Payments", "Payments may be processed by third-party payment providers. BookEasy may receive payment references and transaction status information. Payment details handled directly by the provider are subject to that provider's privacy practices."],
      ["4. Sharing", "Information may be shared with the business involved in a booking, service providers supporting BookEasy, or authorities where required by law. We do not promise that information is never shared."],
      ["5. Security and retention", "We use reasonable safeguards designed to protect information. Information is retained only as needed for platform operations, legitimate business purposes, dispute resolution, and legal obligations."],
      ["6. Your choices and requests", "You may contact BookEasy to request access, correction, or deletion of personal information where applicable law provides that right. Some records may need to be retained for legal or operational reasons."],
      ["7. Cookies and technical data", "The website may use local storage, cookies, and similar technologies to maintain sessions, remember preferences, and support essential functionality."],
      ["8. Healthcare and sensitive information", "Businesses, particularly healthcare providers, should avoid entering unnecessary medical or other sensitive details into booking fields. BookEasy should not be used to store sensitive information unless the relevant feature and safeguards are expressly intended for that purpose."],
      ["9. Children", "BookEasy is intended for use by businesses and people legally able to use the service. A parent or lawful guardian should contact us if they believe a child has submitted personal information inappropriately."],
      ["10. Policy updates", "We may update this policy from time to time. The latest version will be published on this page with its updated date."],
      ["11. Contact", "For privacy questions or requests, contact BookEasy through its official support contact published on our website."]
    ]
  },
  "/refund-policy": {
    title: "Cancellation & Refund Policy",
    updated: "28 October 2026",
    sections: [
      ["1. Scope", "This policy covers BookEasy subscription payments only. Appointments and services sold by independent businesses are governed by the relevant business's own cancellation and refund terms."],
      ["2. Subscription cancellation", "You may request cancellation of your subscription using the available account or payment-provider options, or by contacting BookEasy support. Cancellation stops future renewal only when the relevant subscription or payment arrangement has been successfully cancelled. Access may continue until the end of the paid period, depending on the plan and payment arrangement."],
      ["3. Requesting a refund", "Send a refund request to BookEasy's official support contact. Include the account email, payment date, transaction or payment reference, amount, and reason for the request. Do not send passwords, OTPs, or full card details."],
      ["4. Review and eligibility", "Requests are reviewed individually. Examples that may warrant review include duplicate charges, verified payment errors, or a successful payment where the purchased plan was not activated and the issue could not be resolved. Refunds will also be provided where required by applicable law. These examples do not override any mandatory legal rights."],
      ["5. Manual processing", "Refunds are reviewed and, if approved, processed manually through the relevant payment-provider dashboard, such as Razorpay when applicable. BookEasy does not provide an automated in-app refund facility. Submission of a request does not guarantee approval."],
      ["6. Processing time", "After approval, the time taken for the amount to appear in your account depends on the payment provider, bank, payment method, and applicable rules. BookEasy cannot guarantee a specific settlement date."],
      ["7. Contact", "For subscription cancellation or refund requests, contact BookEasy using its official support contact published on our website."]
    ]
  }
};

export default function LegalPages() {
  const { pathname } = useLocation();
  const policy = policies[pathname];

  if (!policy) {
    return <main style={styles.page}><h1>Policy not found</h1><Link to="/">Return to BookEasy</Link></main>;
  }

  return (
    <main style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.brand}>BookEasy</Link>
        <Link to="/">Home</Link>
      </nav>
      <article style={styles.article}>
        <p style={styles.eyebrow}>BOOKEASY · LEGAL</p>
        <h1 style={styles.title}>{policy.title}</h1>
        <p style={styles.muted}>Last updated: {policy.updated}</p>
        <p style={styles.intro}>
          Please read this policy carefully. By using BookEasy, you acknowledge
          the terms applicable to the services you use.
        </p>
        {policy.sections.map(([heading, body]) => (
          <section key={heading} style={styles.section}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <div style={styles.links}>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/refund-policy">Cancellation & Refund Policy</Link>
        </div>
      </article>
      <footer style={styles.footer}>
        © {new Date().getFullYear()} BookEasy
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
    padding: "0 20px"
  },
  nav: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "22px 0",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #e2e8f0"
  },
  brand: { fontWeight: 800, color: "#2563eb", textDecoration: "none" },
  article: {
    maxWidth: 820,
    margin: "38px auto",
    padding: "clamp(22px, 5vw, 48px)",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    lineHeight: 1.75
  },
  eyebrow: { color: "#2563eb", fontWeight: 700, fontSize: 12, letterSpacing: 1.5 },
  title: { fontSize: "clamp(30px, 5vw, 42px)", lineHeight: 1.2 },
  muted: { color: "#64748b", fontSize: 14 },
  intro: { margin: "28px 0", color: "#334155" },
  section: { marginTop: 28 },
  links: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 24,
    marginTop: 36
  },
  footer: { textAlign: "center", padding: "20px", color: "#64748b", fontSize: 13 }
};

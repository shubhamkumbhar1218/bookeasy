import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CustomerDashboard.css";
import BookEasyContact from "./BookEasyContact";

import {
  Search,
  MapPin,
  Store,
  Phone,
  CalendarDays,
  X,
  Star,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api";

function CustomerDashboard() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  const [businesses, setBusinesses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [helpOpen, setHelpOpen] = useState(false);
const [expandedFaq, setExpandedFaq] = useState(null);

const faqs = [
  {
    question: "How do I book a service?",
    answer:
      "Search for a business, choose the service you want, and click Book Now to continue with the booking.",
  },
  {
    question: "Where can I view my bookings?",
    answer:
      "Click My Bookings in the header to view your booking information.",
  },
  {
    question: "Can I cancel or reschedule a booking?",
    answer:
      "Open your booking details and check the available actions for that appointment. Changes depend on the booking status and the business's available slots.",
  },
  {
    question: "How do I find a business?",
    answer:
      "Enter a business name, location, or service in the search box. You can also filter by category and sort the results.",
  },
  {
    question: "How do I contact BookEasy support?",
    answer:
      "Use the existing BookEasy contact section on this page to find the available support contact options.",
  },
];

const categories = [
  { value: "all", label: "All Categories" },
  { value: "salon", label: "Salon" },
  { value: "barber", label: "Barber" },
  { value: "tutor", label: "Tutor" },
  { value: "gym", label: "Gym" },
  { value: "repair shop", label: "Repair Shop" },
  { value: "hospital", label: "Hospital" },
  { value: "dental clinic", label: "Dental Clinic" },
  { value: "doctor / clinic", label: "Doctor / Clinic" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "spa & wellness", label: "Spa & Wellness" },
  { value: "yoga & meditation", label: "Yoga & Meditation" },
  {
    value: "pet clinic / veterinary",
    label: "Pet Clinic / Veterinary",
  },
  {
    value: "car & bike service",
    label: "Car & Bike Service",
  },
  {
    value: "photography studio",
    label: "Photography Studio",
  },
  {
    value: "coaching classes",
    label: "Coaching Classes",
  },
  { value: "makeup artist", label: "Makeup Artist" },
  { value: "tailor", label: "Tailor" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "computer repair", label: "Computer Repair" },
  { value: "consultant", label: "Consultant" },
  { value: "driving school", label: "Driving School" },
  { value: "diagnostic lab", label: "Diagnostic Lab" },
  {
    value: "nutritionist / dietitian",
    label: "Nutritionist / Dietitian",
  },
  {
    value: "laundry & dry cleaning",
    label: "Laundry & Dry Cleaning",
  },
  { value: "other", label: "Other" },
];

  // ======================================================
  // SEARCH BUSINESSES
  // ======================================================

  const searchBusinesses = async () => {
    try {
      setLoading(true);
      setError("");
      setSearched(true);

      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (category !== "all") {
        params.append("category", category);
      }

      const response = await fetch(
        `${API}/business/search?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to search businesses"
        );
      }

      setBusinesses(data.businesses || []);
    } catch (error) {
      console.log(error);

      setError(
        error.message || "Something went wrong"
      );

      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // CLEAR ALL
  // ======================================================

  const clearSearch = () => {
    setSearch("");
    setCategory("all");
    setSortBy("rating");
    setBusinesses([]);
    setSearched(false);
    setError("");
  };

  // ======================================================
  // REMOVE SEARCH TEXT
  // ======================================================

  const clearSearchText = () => {
    setSearch("");
  };

  // ======================================================
  // REMOVE CATEGORY
  // ======================================================

  const clearCategory = () => {
    setCategory("all");
  };

  // ======================================================
  // CATEGORY NAME
  // ======================================================

  const getCategoryName = (type) => {
    const category = categories.find(
      (item) => item.value === type
    );

    return category
      ? category.label
      : "Other";
  };

  // ======================================================
  // SORT BUSINESSES
  // ======================================================

  const getSortedBusinesses = () => {
    const sorted = [...businesses];

    if (sortBy === "rating") {
      return sorted.sort(
        (a, b) =>
          (b.averageRating || 0) -
          (a.averageRating || 0)
      );
    }

    if (sortBy === "price-low") {
      return sorted.sort((a, b) => {
        const priceA =
          a.services?.length > 0
            ? Math.min(
                ...a.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        const priceB =
          b.services?.length > 0
            ? Math.min(
                ...b.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        return priceA - priceB;
      });
    }

    if (sortBy === "price-high") {
      return sorted.sort((a, b) => {
        const priceA =
          a.services?.length > 0
            ? Math.min(
                ...a.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        const priceB =
          b.services?.length > 0
            ? Math.min(
                ...b.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        return priceB - priceA;
      });
    }

    if (sortBy === "name") {
      return sorted.sort((a, b) =>
        (a.businessName || "").localeCompare(
          b.businessName || ""
        )
      );
    }

    return sorted;
  };

  // ======================================================
  // RENDER STARS
  // ======================================================

  const renderStars = (rating) => {
    return (
      <div className="service-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={15}
            fill={
              star <= Math.round(rating)
                ? "currentColor"
                : "none"
            }
          />
        ))}
      </div>
    );
  };

  const sortedBusinesses = getSortedBusinesses();

  const selectedCategoryName =
    getCategoryName(category);

  return (
    <div className="customer-page">

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}


<header className="customer-header">
  <div className="customer-brand">
    <div className="customer-brand-icon">
      <Store size={22} />
    </div>

    <div>
      <h1>BookEasy</h1>
      <span>Find & Book Local Services</span>
    </div>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      className="outline"
      onClick={() => {
        const savedUser = JSON.parse(
          localStorage.getItem("bookeasy_user") || "{}"
        );

        if (savedUser.businessSlug) {
          navigate(`/book/${savedUser.businessSlug}/status`);
        } else {
          navigate("/customer/bookings");
        }
      }}
    >
      <CalendarDays size={17} />
      My Bookings
    </button>

    <button
      type="button"
      className="outline"
      onClick={() => {
        navigate("/business/dashboard");
      }}
    >
      <CalendarDays size={17} />
      Back to Business Dashboard
    </button>
  </div>
</header>


      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}

      <main className="customer-main">

        <section className="customer-hero">

          <p className="eyebrow">
            FIND LOCAL BUSINESSES
          </p>

          <h2>
            Find a business near you
          </h2>

          <p className="customer-subtitle">
            Search businesses by name, location,
            or service and compare ratings before
            booking.
          </p>

          {/* ========================= */}
          {/* SEARCH BOX */}
          {/* ========================= */}

          <div className="customer-search-box">

            {/* SEARCH INPUT */}

            <div className="search-field customer-main-search">

              <Search size={20} />

              <input
                type="text"
                placeholder="Search business, location or service..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchBusinesses();
                  }
                }}
              />

              {search && (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={clearSearchText}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}

            </div>

            {/* CATEGORY */}

            <div className="search-field category-select-field">

              <Store size={20} />

              <select
                className="category-select"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
              >
                {categories.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>

            </div>

            {/* SEARCH BUTTON */}

            <button
              className="primary customer-search-button"
              type="button"
              onClick={searchBusinesses}
              disabled={loading}
            >
              <Search size={18} />

              {loading
                ? "Searching..."
                : "Search"}
            </button>

          </div>

          {/* ========================= */}
          {/* ACTIVE FILTERS */}
          {/* ========================= */}

          {(search.trim() ||
            category !== "all") && (
            <div className="active-filters">

              <div className="active-filter-label">
                <SlidersHorizontal size={15} />
                Active filters
              </div>

              {search.trim() && (
                <button
                  type="button"
                  className="filter-chip"
                  onClick={clearSearchText}
                >
                  <Search size={13} />

                  <span>
                    {search.trim()}
                  </span>

                  <X size={14} />
                </button>
              )}

              {category !== "all" && (
                <button
                  type="button"
                  className="filter-chip"
                  onClick={clearCategory}
                >
                  <Store size={13} />

                  <span>
                    {selectedCategoryName}
                  </span>

                  <X size={14} />
                </button>
              )}

              <button
                type="button"
                className="clear-filters-button"
                onClick={clearSearch}
              >
                Clear all
              </button>

            </div>
          )}

        </section>

        {/* ========================= */}
        {/* ERROR */}
        {/* ========================= */}

        {error && (
          <div className="error customer-error">
            {error}
          </div>
        )}

        {/* ========================= */}
        {/* RESULTS */}
        {/* ========================= */}

        <section className="customer-results">

          <div className="customer-results-header">

            <div>

              <p className="eyebrow">
                BUSINESSES
              </p>

              <h2>
                {searched
                  ? `${businesses.length} businesses found`
                  : "Explore businesses"}
              </h2>

            </div>

            {searched &&
              businesses.length > 0 && (
                <div className="result-controls">

                  <div className="sort-label">
                    <ArrowUpDown size={16} />
                    <span>Sort by</span>
                  </div>

                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value)
                    }
                  >
                    <option value="rating">
                      Top Rated
                    </option>

                    <option value="name">
                      Name
                    </option>

                    <option value="price-low">
                      Price: Low to High
                    </option>

                    <option value="price-high">
                      Price: High to Low
                    </option>
                  </select>

                </div>
              )}

            {searched && (
              <button
                className="outline"
                type="button"
                onClick={clearSearch}
              >
                <X size={17} />
                Clear
              </button>
            )}

          </div>

          {/* ========================= */}
          {/* LOADING */}
          {/* ========================= */}

          {loading && (
            <div className="customer-empty">

              <div className="loading-icon">
                <Search size={32} />
              </div>

              <h3>
                Finding businesses...
              </h3>

              <p>
                Please wait while we search
                for available services.
              </p>

            </div>
          )}

          {/* ========================= */}
          {/* NO RESULTS */}
          {/* ========================= */}

          {!loading &&
            searched &&
            businesses.length === 0 && (
              <div className="customer-empty">

                <div className="empty-icon">
                  <Store size={40} />
                </div>

                <h3>
                  No businesses found
                </h3>

                <p>
                  We couldn't find a business
                  matching your search.
                </p>

                <div className="empty-suggestions">
                  <span>
                    Try:
                  </span>

                  <span>
                    • A different location
                  </span>

                  <span>
                    • Another category
                  </span>

                  <span>
                    • A service name
                  </span>
                </div>

                <button
                  className="outline empty-clear-button"
                  type="button"
                  onClick={clearSearch}
                >
                  <X size={17} />
                  Clear filters
                </button>

              </div>
            )}

          {/* ========================= */}
          {/* INITIAL STATE */}
          {/* ========================= */}

          {!loading &&
            !searched && (
              <div className="customer-empty">

                <div className="empty-icon">
                  <Search size={40} />
                </div>

                <h3>
                  Search for a business
                </h3>

                <p>
                  Search by business name,
                  location, or service and
                  choose a category.
                </p>

                <div className="quick-search-hints">

                  <span>
                    <MapPin size={14} />
                    Location
                  </span>

                  <span>
                    <Store size={14} />
                    Business
                  </span>

                  <span>
                    <Search size={14} />
                    Service
                  </span>

                </div>

              </div>
            )}

          {/* ========================= */}
          {/* BUSINESS CARDS */}
          {/* ========================= */}

          {!loading &&
            sortedBusinesses.length > 0 && (
              <div className="business-results-grid">

                {sortedBusinesses.map(
                  (business) => (
                    <div
                      className="business-result-card"
                      key={business._id}
                    >

                      {/* BUSINESS TOP */}

                      
<div className="business-card-top">

  <div className="business-icon">
    {business.profilePhoto ? (
      <img
        src={business.profilePhoto}
        alt={`${business.businessName} profile`}
        className="business-profile-photo"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    ) : (
      <Store size={25} />
    )}
  </div>

  <span className="business-category">
    {getCategoryName(business.businessType)}
  </span>

</div>


                      {/* BUSINESS NAME */}

                      <h3>
                        {business.businessName}
                      </h3>

                      {/* BUSINESS OVERALL RATING */}

                      <div className="business-overall-rating">

                        {business.totalReviews > 0 ? (
                          <>
                            <div className="business-rating-stars">

                              {[1, 2, 3, 4, 5].map(
                                (star) => (
                                  <Star
                                    key={star}
                                    size={17}
                                    fill={
                                      star <=
                                      Math.round(
                                        business.averageRating
                                      )
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />
                                )
                              )}

                            </div>

                            <strong>
                              {business.averageRating}
                            </strong>

                            <span>
                              {business.totalReviews}{" "}
                              review
                              {business.totalReviews !==
                              1
                                ? "s"
                                : ""}
                            </span>
                          </>
                        ) : (
                          <div className="business-no-rating">

                            <Star size={17} />

                            <span>
                              No reviews yet
                            </span>

                          </div>
                        )}

                      </div>

                      {/* BUSINESS INFO */}

                      <div className="business-info">

                        {business.address && (
                          <div>

                            <MapPin size={17} />

                            <span>
                              {business.address}
                            </span>

                          </div>
                        )}

                        {business.phone && (
                          <div>

                            <Phone size={17} />

                            <span>
                              {business.phone}
                            </span>

                          </div>
                        )}

                      </div>

                      {/* ========================= */}
                      {/* SERVICES */}
                      {/* ========================= */}

                      {business.services &&
                        business.services.length > 0 && (
                          <div className="business-services">

                            <div className="services-title">
                              Services
                            </div>

                            {business.services.map(
                              (service) => (
                                <div
                                  className="service-result-card"
                                  key={service._id}
                                >

                                  <div className="service-result-main">

                                    <div>

                                      <h4>
                                        {service.name}
                                      </h4>

                                      {service.description && (
                                        <p>
                                          {
                                            service.description
                                          }
                                        </p>
                                      )}

                                    </div>

                                    <strong className="service-price">
                                      ₹{service.price}
                                    </strong>

                                  </div>

                                  <div className="service-result-bottom">

                                    <div className="service-rating">

                                      {service.totalReviews >
                                      0 ? (
                                        <>
                                          {renderStars(
                                            service.averageRating
                                          )}

                                          <strong>
                                            {
                                              service.averageRating
                                            }
                                          </strong>

                                          <span>
                                            (
                                            {
                                              service.totalReviews
                                            }{" "}
                                            review
                                            {service.totalReviews !==
                                            1
                                              ? "s"
                                              : ""}
                                            )
                                          </span>
                                        </>
                                      ) : (
                                        <div className="service-no-rating">

                                          <Star size={15} />

                                          <span>
                                            No reviews yet
                                          </span>

                                        </div>
                                      )}

                                    </div>

                                    <span className="service-duration">
                                      {service.duration} min
                                    </span>

                                  </div>

                                </div>
                              )
                            )}

                          </div>
                        )}

                      {/* BOOK BUTTON */}

                      <button
                        className="primary book-business-button"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/book/${business.businessSlug}`
                          )
                        }
                      >
                        <CalendarDays size={18} />
                        Book Now
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

        </section>


</main>

<BookEasyContact />

{/* Floating Help / FAQ */}
{helpOpen && (
  <section
    role="dialog"
    aria-label="Help and frequently asked questions"
    style={{
      position: "fixed",
      right: "20px",
      bottom: "96px",
      width: "min(380px, calc(100vw - 32px))",
      maxHeight: "min(520px, calc(100vh - 130px))",
      display: "flex",
      flexDirection: "column",
      background: "#ffffff",
      border: "1px solid #dbe5f2",
      borderRadius: "18px",
      boxShadow: "0 12px 40px rgba(15, 23, 42, 0.20)",
      zIndex: 1000,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px",
        background: "#2563eb",
        color: "#ffffff",
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: "18px" }}>
          Help & FAQ
        </h3>
        <p style={{ margin: "5px 0 0", fontSize: "12px" }}>
          How can we help you?
        </p>
      </div>

      <button
        type="button"
        onClick={() => setHelpOpen(false)}
        aria-label="Close help"
        style={{
          border: "none",
          background: "transparent",
          color: "#ffffff",
          cursor: "pointer",
          padding: "5px",
        }}
      >
        <X size={22} />
      </button>
    </div>

    <div style={{ overflowY: "auto", padding: "12px 16px" }}>
      {faqs.map((faq, index) => {
        const isExpanded = expandedFaq === index;

        return (
          <div
            key={faq.question}
            style={{
              borderBottom: "1px solid #e5e7eb",
              padding: "13px 0",
            }}
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() =>
                setExpandedFaq(isExpanded ? null : index)
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                textAlign: "left",
                border: "none",
                background: "transparent",
                color: "#1e293b",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              <span>{faq.question}</span>
              <span aria-hidden="true">
                {isExpanded ? "−" : "+"}
              </span>
            </button>

            {isExpanded && (
              <p
                style={{
                  margin: "10px 0 2px",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.7,
                }}
              >
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  </section>
)}

<button
  type="button"
  onClick={() => setHelpOpen((open) => !open)}
  aria-label={helpOpen ? "Close help and FAQ" : "Open help and FAQ"}
  aria-expanded={helpOpen}
  style={{
    position: "fixed",
    right: "20px",
    bottom: "20px",
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "30px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 5px 18px rgba(37, 99, 235, 0.4)",
    zIndex: 1001,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  {helpOpen ? <X size={25} /> : "?"}
</button>


      {/* Legal Policies Footer */}
      <footer
        aria-label="Legal policies"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px 22px",
          padding: "22px 16px",
          borderTop: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/terms")}
          style={legalLinkStyle}
        >
          Terms &amp; Conditions
        </button>

        <button
          type="button"
          onClick={() => navigate("/privacy")}
          style={legalLinkStyle}
        >
          Privacy Policy
        </button>

        <button
          type="button"
          onClick={() => navigate("/refund-policy")}
          style={legalLinkStyle}
        >
          Cancellation &amp; Refund Policy
        </button>

        <span
          style={{
            width: "100%",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "12px",
          }}
        >
          © {new Date().getFullYear()} BookEasy
        </span>
      </footer>

    </div>

  );
}

const legalLinkStyle = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  fontSize: "13px",
  cursor: "pointer",
  padding: "4px",
};

export default CustomerDashboard;


    {/* </div>
  );
}

export default CustomerDashboard; */}
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "./styles/CustomerBookings.css";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Phone,
  Search,
  Store,
  XCircle,
  Star,
  X,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

function CustomerBookings() {
  const { businessSlug } = useParams();
  const [searchParams] = useSearchParams();

  const phoneFromUrl = searchParams.get("phone");

  // ================================
  // BOOKING STATES
  // ================================

  const [notifications, setNotifications] = useState([]);
  const [business, setBusiness] = useState(null);
  const [phone, setPhone] = useState(phoneFromUrl || "");
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // ================================
  // REVIEW STATES
  // ================================

  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [reviewedBookings, setReviewedBookings] = useState({});

  // ================================
  // CHECK REVIEW STATUS
  // ================================

  const checkReviewStatus = async (booking) => {
    try {
      const response = await fetch(
        `${API}/reviews/booking/${booking._id}?phone=${encodeURIComponent(
          phone.trim()
        )}`
      );

      const data = await response.json();

      if (response.ok) {
        setReviewedBookings((current) => ({
          ...current,
          [booking._id]: Boolean(data.alreadyReviewed),
        }));
      }
    } catch (error) {
      console.log("Review status error:", error);
    }
  };

  // ================================
  // OPEN REVIEW MODAL
  // ================================

  const openReviewModal = (booking) => {
    setReviewBooking(booking);
    setReviewRating(0);
    setHoverRating(0);
    setReviewText("");
    setReviewError("");
  };

  // ================================
  // CLOSE REVIEW MODAL
  // ================================

  const closeReviewModal = () => {
    if (reviewLoading) return;

    setReviewBooking(null);
    setReviewRating(0);
    setHoverRating(0);
    setReviewText("");
    setReviewError("");
  };

  // ================================
  // LOAD CUSTOMER NOTIFICATIONS
  // ================================

  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `${API}/notifications/customer?phone=${encodeURIComponent(
          phone.trim()
        )}`
      );

      const notificationsData = await response.json();

      if (!response.ok) {
        throw new Error(
          notificationsData.message ||
            "Unable to load notifications"
        );
      }

      setNotifications(notificationsData);
    } catch (error) {
      console.log("Customer notification error:", error);
    }
  };

  // ================================
  // MARK NOTIFICATION AS READ
  // ================================

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API}/notifications/customer/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: phone.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to mark notification as read"
        );
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.log("Read notification error:", error);
    }
  };

  // ================================
  // SUBMIT REVIEW
  // ================================

  const submitReview = async () => {
    setReviewError("");

    if (!reviewBooking) {
      setReviewError("Booking information is missing.");
      return;
    }

    if (!reviewRating) {
      setReviewError("Please select a rating.");
      return;
    }

    if (!reviewText.trim()) {
      setReviewError("Please write a review.");
      return;
    }

    if (reviewText.trim().length < 3) {
      setReviewError(
        "Review must contain at least 3 characters."
      );
      return;
    }

    try {
      setReviewLoading(true);

      const response = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: reviewBooking._id,
          customerName: reviewBooking.customerName,
          customerPhone: phone.trim(),
          rating: reviewRating,
          review: reviewText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to submit review."
        );
      }

      setReviewedBookings((current) => ({
        ...current,
        [reviewBooking._id]: true,
      }));

      closeReviewModal();

      alert(
        "Thank you! Your review has been submitted."
      );
    } catch (error) {
      console.log("Submit review error:", error);

      setReviewError(
        error.message ||
          "Unable to submit review."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  // ================================
  // CHECK BOOKINGS
  // ================================

  const checkBookings = async (e) => {
    if (e) {
      e.preventDefault();
    }

    setError("");
    setBookings([]);
    setNotifications([]);
    setReviewedBookings({});
    setSearched(false);

    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      setLoading(true);

      // --------------------------------
      // GET BUSINESS
      // --------------------------------

      const businessResponse = await fetch(
        `${API}/business/${businessSlug}`
      );

      const businessData =
        await businessResponse.json();

      if (!businessResponse.ok) {
        throw new Error(
          businessData.message ||
            "Business not found"
        );
      }

      setBusiness(businessData);

      // --------------------------------
      // GET CUSTOMER BOOKINGS
      // --------------------------------

      const response = await fetch(
        `${API}/bookings/customer?businessId=${
          businessData._id
        }&phone=${encodeURIComponent(
          phone.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to find bookings"
        );
      }

      setBookings(data);
      setSearched(true);

      // --------------------------------
      // CHECK REVIEW STATUS
      // --------------------------------

      for (const booking of data) {
        if (booking.status === "completed") {
          await checkReviewStatus(booking);
        }
      }

      // --------------------------------
      // LOAD NOTIFICATIONS
      // --------------------------------

      await loadNotifications();
    } catch (error) {
      console.log("Check bookings error:", error);

      setError(
        error.message ||
          "Unable to check bookings."
      );
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // STATUS CLASS
  // ================================

  const getStatusClass = (status) => {
    return `booking-status ${status}`;
  };

  // ================================
  // STATUS ICON
  // ================================

  const getStatusIcon = (status) => {
    if (status === "confirmed") {
      return <CheckCircle2 size={17} />;
    }

    if (status === "cancelled") {
      return <XCircle size={17} />;
    }

    if (status === "completed") {
      return <CheckCircle2 size={17} />;
    }

    return <Clock3 size={17} />;
  };

  // ================================
  // NOTIFICATION ICON
  // ================================

  const getNotificationIcon = (type) => {
    if (type === "booking_confirmed") {
      return <CheckCircle2 size={20} />;
    }

    if (type === "booking_cancelled") {
      return <XCircle size={20} />;
    }

    if (type === "booking_completed") {
      return <CheckCircle2 size={20} />;
    }

    if (type === "booking_rescheduled") {
      return <CalendarDays size={20} />;
    }

    return <Clock3 size={20} />;
  };

  return (
    <div className="customer-status-page">
      {/* =================================
          HEADER
      ================================= */}

      <header className="customer-header">
        <div className="brand">
          <Store size={25} />
          <span>BookEasy</span>
        </div>

        <span className="customer-header-text">
          My Bookings
        </span>
      </header>

      <main className="customer-status-main">
        {/* =================================
            HERO
        ================================= */}

        <section className="status-hero">
          <div className="status-icon">
            <Search size={30} />
          </div>

          <p className="eyebrow">
            MANAGE YOUR APPOINTMENT
          </p>

          <h1>Check your booking</h1>

          <p>
            Enter the phone number you used when
            booking your appointment.
          </p>
        </section>

        {/* =================================
            SEARCH CARD
        ================================= */}

        <section className="status-search-card">
          <form onSubmit={checkBookings}>
            <label>
              Phone number

              <div className="phone-input">
                <Phone size={18} />

                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                />
              </div>
            </label>

            <button
              className="primary"
              type="submit"
              disabled={loading}
            >
              <Search size={18} />

              {loading
                ? "Checking..."
                : "Check Booking"}
            </button>
          </form>
        </section>

        {/* =================================
            ERROR
        ================================= */}

        {error && (
          <div className="error booking-alert">
            {error}
          </div>
        )}

        {/* =================================
            NO BOOKINGS
        ================================= */}

        {searched && bookings.length === 0 && (
          <section className="no-bookings">
            <CalendarDays size={35} />

            <h3>No bookings found</h3>

            <p>
              We couldn't find any booking for this
              phone number.
            </p>
          </section>
        )}

        {/* =================================
            NOTIFICATIONS
        ================================= */}

        {notifications.length > 0 && (
          <section className="customer-notifications">
            <div className="results-heading">
              <div>
                <p className="eyebrow">
                  NOTIFICATIONS
                </p>

                <h2>Booking Updates</h2>
              </div>
            </div>

            <div className="notification-list">
              {notifications.map(
                (notification) => (
                  <div
                    className={`customer-notification-card ${
                      notification.isRead
                        ? "read"
                        : "unread"
                    }`}
                    key={notification._id}
                    onClick={() =>
                      !notification.isRead &&
                      markNotificationAsRead(
                        notification._id
                      )
                    }
                  >
                    <div className="customer-notification-icon">
                      {getNotificationIcon(
                        notification.type
                      )}
                    </div>

                    <div>
                      <h3>
                        {notification.title}
                      </h3>

                      <p>
                        {notification.message}
                      </p>

                      <small>
                        {new Date(
                          notification.createdAt
                        ).toLocaleString("en-IN")}
                      </small>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* =================================
            BOOKINGS
        ================================= */}

        {bookings.length > 0 && (
          <section className="customer-bookings-list">
            <div className="results-heading">
              <div>
                <p className="eyebrow">
                  YOUR BOOKINGS
                </p>

                <h2>
                  {business?.businessName}
                </h2>
              </div>

              <span>
                {bookings.length} booking
                {bookings.length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>

            {bookings.map((booking) => (
              <article
                className="customer-booking-card"
                key={booking._id}
              >
                {/* =========================
                    BOOKING TOP
                ========================= */}

                <div className="booking-card-top">
                  <div>
                    <h3>
                      {booking.serviceId?.name ||
                        "Service"}
                    </h3>

                    <p>
                      ₹
                      {booking.serviceId?.price ||
                        0}
                      {" · "}
                      {booking.serviceId?.duration ||
                        0}
                      {" minutes"}
                    </p>
                  </div>

                  <div
                    className={getStatusClass(
                      booking.status
                    )}
                  >
                    {getStatusIcon(
                      booking.status
                    )}

                    <span>
                      {booking.status}
                    </span>
                  </div>
                </div>

                {/* =========================
                    BOOKING DETAILS
                ========================= */}

                <div className="booking-card-details">
                  <div>
                    <CalendarDays size={18} />

                    <span>
                      {new Date(
                        booking.bookingDate
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>

                  <div>
                    <Clock3 size={18} />

                    <span>
                      {new Date(
                        booking.bookingDate
                      ).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                </div>

                {/* =========================
                    REVIEW BUTTON
                ========================= */}

                {booking.status === "completed" &&
                  !reviewedBookings[
                    booking._id
                  ] && (
                    <button
                      type="button"
                      className="review-service-button"
                      onClick={() =>
                        openReviewModal(booking)
                      }
                    >
                      <Star size={17} />

                      Rate & Review
                    </button>
                  )}

                {/* =========================
                    REVIEW SUBMITTED
                ========================= */}

                {booking.status === "completed" &&
                  reviewedBookings[
                    booking._id
                  ] && (
                    <div className="review-submitted">
                      <CheckCircle2 size={16} />

                      <span>
                        Review submitted
                      </span>
                    </div>
                  )}
              </article>
            ))}
          </section>
        )}
      </main>

      {/* =================================
          REVIEW MODAL
      ================================= */}

      {reviewBooking && (
        <div
          className="review-modal-overlay"
          onClick={closeReviewModal}
        >
          <div
            className="review-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* CLOSE BUTTON */}

            <button
              type="button"
              className="review-close-button"
              onClick={closeReviewModal}
              disabled={reviewLoading}
              aria-label="Close review"
            >
              <X size={20} />
            </button>

            {/* MODAL ICON */}

            <div className="review-modal-icon">
              <Star size={28} />
            </div>

            <p className="review-modal-eyebrow">
              SHARE YOUR EXPERIENCE
            </p>

            {/* SERVICE NAME */}

            <h2>
              Rate{" "}
              {reviewBooking.serviceId?.name ||
                "this service"}
            </h2>

            <p className="review-modal-description">
              How was your experience with this
              service?
            </p>

            {/* STAR RATING */}

            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(
                (star) => {
                  const active =
                    star <=
                    (hoverRating ||
                      reviewRating);

                  return (
                    <button
                      key={star}
                      type="button"
                      className={
                        active
                          ? "star active"
                          : "star"
                      }
                      onMouseEnter={() =>
                        setHoverRating(star)
                      }
                      onMouseLeave={() =>
                        setHoverRating(0)
                      }
                      onClick={() =>
                        setReviewRating(star)
                      }
                      disabled={reviewLoading}
                      aria-label={`${star} star`}
                    >
                      <Star
                        size={35}
                        fill={
                          active
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  );
                }
              )}
            </div>

            {/* RATING LABEL */}

            <div className="rating-label">
              {reviewRating === 1 &&
                "Very Poor"}

              {reviewRating === 2 &&
                "Poor"}

              {reviewRating === 3 &&
                "Good"}

              {reviewRating === 4 &&
                "Very Good"}

              {reviewRating === 5 &&
                "Excellent"}
            </div>

            {/* REVIEW TEXT */}

            <label className="review-text-label">
              Your review

              <textarea
                value={reviewText}
                onChange={(e) =>
                  setReviewText(
                    e.target.value
                  )
                }
                placeholder="Tell us about your experience..."
                maxLength={500}
                rows={5}
                disabled={reviewLoading}
              />

              <span>
                {reviewText.length}/500
              </span>
            </label>

            {/* REVIEW ERROR */}

            {reviewError && (
              <div className="review-error">
                {reviewError}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="button"
              className="submit-review-button"
              onClick={submitReview}
              disabled={reviewLoading}
            >
              <Star size={18} />

              {reviewLoading
                ? "Submitting..."
                : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {/* =================================
          FOOTER
      ================================= */}

      <footer className="customer-footer">
        Powered by BookEasy
      </footer>
    </div>
  );
}

export default CustomerBookings;
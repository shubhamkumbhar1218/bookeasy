import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/BookingPages.css";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Store,
  Star,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

function BookingPages() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);

  const [selectedService, setSelectedService] =
    useState(null);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [selectedTime, setSelectedTime] =
    useState("");

  const [slots, setSlots] = useState([]);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // REVIEW STATES
  // ==========================================

  const [serviceReviews, setServiceReviews] =
    useState({});

  const [loadingReviews, setLoadingReviews] =
    useState({});

  // ==========================================
  // LOAD REVIEWS FOR A SERVICE
  // ==========================================

  const loadServiceReviews = async (serviceId) => {
    try {
      setLoadingReviews((current) => ({
        ...current,
        [serviceId]: true,
      }));

      const response = await fetch(
        `${API}/reviews/service/${serviceId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load reviews"
        );
      }

      setServiceReviews((current) => ({
        ...current,
        [serviceId]: data,
      }));
    } catch (error) {
      console.log(
        "Service reviews error:",
        error
      );

      // If review API is not available,
      // don't break the booking page.
      setServiceReviews((current) => ({
        ...current,
        [serviceId]: {
          reviews: [],
          totalReviews: 0,
          averageRating: 0,
        },
      }));
    } finally {
      setLoadingReviews((current) => ({
        ...current,
        [serviceId]: false,
      }));
    }
  };

  // ==========================================
  // LOAD BUSINESS + SERVICES
  // ==========================================

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        setLoading(true);
        setError("");

        // ------------------------------------
        // Load business
        // ------------------------------------

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

        // ------------------------------------
        // Load services
        // ------------------------------------

        const servicesResponse =
          await fetch(
            `${API}/services/${businessData._id}`
          );

        const servicesData =
          await servicesResponse.json();

        if (!servicesResponse.ok) {
          throw new Error(
            servicesData.message ||
              "Unable to load services"
          );
        }

        setServices(servicesData);

        // ------------------------------------
        // Load reviews for every service
        // ------------------------------------

        for (const service of servicesData) {
          loadServiceReviews(service._id);
        }
      } catch (error) {
        console.log(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [businessSlug]);

  // ==========================================
  // LOAD AVAILABLE SLOTS
  // ==========================================

  useEffect(() => {
    const loadSlots = async () => {
      if (
        !selectedService ||
        !selectedDate ||
        !business
      ) {
        setSlots([]);
        setSelectedTime("");
        return;
      }

      try {
        setLoadingSlots(true);
        setError("");
        setSelectedTime("");

        const response = await fetch(
          `${API}/bookings/availability?businessId=${business._id}&serviceId=${selectedService._id}&date=${selectedDate}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load available slots"
          );
        }

        // ------------------------------------
        // Remove past times for today
        // ------------------------------------

        const now = new Date();

        const availableSlots =
          data.slots.filter((slot) => {
            const slotDate = new Date(
              slot.value
            );

            if (
              selectedDate ===
              now.toLocaleDateString("en-CA")
            ) {
              return slotDate > now;
            }

            return true;
          });

        setSlots(availableSlots);
      } catch (error) {
        console.log(error);

        setError(error.message);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [
    selectedService,
    selectedDate,
    business,
  ]);

  // ==========================================
  // BOOK APPOINTMENT
  // ==========================================

  const bookAppointment = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedService) {
      setError(
        "Please select a service."
      );
      return;
    }

    if (!selectedDate) {
      setError(
        "Please select a date."
      );
      return;
    }

    if (!selectedTime) {
      setError(
        "Please select a time."
      );
      return;
    }

    if (!customerName.trim()) {
      setError(
        "Please enter your name."
      );
      return;
    }

    if (!customerPhone.trim()) {
      setError(
        "Please enter your phone number."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API}/bookings/public`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            businessId: business._id,
            serviceId:
              selectedService._id,
            customerName:
              customerName.trim(),
            customerPhone:
              customerPhone.trim(),
            bookingDate: selectedTime,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Booking failed"
        );
      }

      setSuccess(
        "Your appointment has been booked successfully!"
      );

      setCustomerName("");
      setCustomerPhone("");
      setSelectedTime("");
      setSelectedDate("");
      setSelectedService(null);
      setSlots([]);
    } catch (error) {
      console.log(error);

      setError(error.message);
    }
  };

  // ==========================================
  // SELECT SERVICE
  // ==========================================

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
    setError("");
    setSuccess("");
  };

  // ==========================================
  // RENDER STARS
  // ==========================================

  const renderStars = (
    rating,
    size = 15
  ) => {
    const roundedRating =
      Math.round(Number(rating) || 0);

    return (
      <div className="service-stars">
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <Star
              key={star}
              size={size}
              fill={
                star <= roundedRating
                  ? "currentColor"
                  : "none"
              }
            />
          )
        )}
      </div>
    );
  };

  // ==========================================
  // LOADING PAGE
  // ==========================================

  if (loading) {
    return (
      <div className="booking-loading">
        <div className="spinner"></div>

        <p>
          Loading business...
        </p>
      </div>
    );
  }

  // ==========================================
  // BUSINESS NOT FOUND
  // ==========================================

  if (error && !business) {
    return (
      <div className="booking-error-page">
        <Store size={40} />

        <h1>
          Business not found
        </h1>

        <p>{error}</p>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="customer-booking-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <header className="customer-header">
        <div className="brand">
          <Store size={25} />

          <span>
            BookEasy
          </span>
        </div>

        <span className="customer-header-text">
          Online Booking
        </span>
      </header>


      {/* ======================================
          MAIN
      ====================================== */}

      <main className="customer-main">

        {/* ====================================
            BUSINESS HERO
        ==================================== */}

        <section className="business-hero">

          <div className="business-icon">
            <Store size={34} />
          </div>

          <div>

            <p className="eyebrow">
              BOOK AN APPOINTMENT
            </p>

            <h1>
              {business.businessName}
            </h1>

            <p className="business-type">
              {business.businessType}
            </p>

            {business.address && (
              <div className="business-detail">
                <MapPin size={16} />

                <span>
                  {business.address}
                </span>
              </div>
            )}

            {business.phone && (
              <div className="business-detail">
                <Phone size={16} />

                <span>
                  {business.phone}
                </span>
              </div>
            )}

          </div>

        </section>


        {/* ====================================
            CHECK APPOINTMENT
        ==================================== */}

        <div className="customer-appointment-section">

          <button
            type="button"
            className="primary"
            onClick={() =>
              navigate(
                `/book/${businessSlug}/status`
              )
            }
          >
            Check My Appointment
          </button>

        </div>


        {/* ====================================
            ERROR
        ==================================== */}

        {error && (
          <div className="error booking-alert">
            {error}
          </div>
        )}


        {/* ====================================
            SUCCESS
        ==================================== */}

        {success && (
          <div className="success booking-alert">

            <CheckCircle2 size={20} />

            <span>
              {success}
            </span>

          </div>
        )}


        {/* ====================================
            BOOKING LAYOUT
        ==================================== */}

        <div className="booking-layout">

          {/* ==================================
              STEP 1 - SERVICES
          ================================== */}

          <section className="booking-panel">

            <div className="booking-panel-header">

              <div>

                <p className="step-number">
                  STEP 1
                </p>

                <h2>
                  Choose a service
                </h2>

                <p className="muted">
                  Select what you want to
                  book.
                </p>

              </div>

            </div>


            {/* ==================================
                SERVICE LIST
            ================================== */}

            <div className="customer-service-list">

              {services.length === 0 ? (

                <p className="empty">
                  No services are currently
                  available.
                </p>

              ) : (

                services.map(
                  (service) => {

                    const reviewData =
                      serviceReviews[
                        service._id
                      ];

                    const isSelected =
                      selectedService?._id ===
                      service._id;

                    return (

                      <div
                        className={`customer-service-wrapper ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        key={service._id}
                      >

                        {/* ==========================
                            SERVICE CARD
                        ========================== */}

                        <button
                          type="button"
                          className={`customer-service-card ${
                            isSelected
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            handleServiceSelect(
                              service
                            )
                          }
                        >

                          <div className="customer-service-info">

                            <strong>
                              {service.name}
                            </strong>

                            {service.description && (
                              <p>
                                {
                                  service.description
                                }
                              </p>
                            )}

                            <small>
                              <Clock3
                                size={14}
                              />

                              {
                                service.duration
                              }{" "}
                              minutes
                            </small>


                            {/* ======================
                                SERVICE RATING
                            ====================== */}

                            {loadingReviews[
                              service._id
                            ] ? (

                              <div className="service-rating-loading">
                                Loading reviews...
                              </div>

                            ) : reviewData &&
                              reviewData.totalReviews >
                                0 ? (

                              <div className="service-rating">

                                {renderStars(
                                  reviewData.averageRating
                                )}

                                <strong>
                                  {
                                    reviewData.averageRating
                                  }
                                </strong>

                                <span>
                                  (
                                  {
                                    reviewData.totalReviews
                                  }{" "}
                                  review
                                  {reviewData.totalReviews !==
                                  1
                                    ? "s"
                                    : ""}
                                  )
                                </span>

                              </div>

                            ) : (

                              <div className="service-no-rating">

                                <Star
                                  size={15}
                                />

                                <span>
                                  No reviews yet
                                </span>

                              </div>

                            )}

                          </div>


                          {/* ======================
                              PRICE
                          ====================== */}

                          <span className="customer-service-price">
                            ₹{service.price}
                          </span>

                        </button>

                      </div>

                    );
                  }
                )

              )}

            </div>

          </section>


          {/* ==================================
              SERVICE REVIEWS
          ================================== */}

          {selectedService && (
            <section className="service-reviews-section">

              <div className="service-reviews-heading">

                <div>

                  <p className="eyebrow">
                    CUSTOMER FEEDBACK
                  </p>

                  <h3>
                    Reviews for{" "}
                    {selectedService.name}
                  </h3>

                </div>


                {/* ==============================
                    RATING SUMMARY
                ============================== */}

                {serviceReviews[
                  selectedService._id
                ] &&
                  serviceReviews[
                    selectedService._id
                  ].totalReviews > 0 && (

                    <div className="service-rating-summary">

                      <Star
                        size={20}
                        fill="currentColor"
                      />

                      <strong>
                        {
                          serviceReviews[
                            selectedService._id
                          ].averageRating
                        }
                      </strong>

                      <span>
                        {
                          serviceReviews[
                            selectedService._id
                          ].totalReviews
                        }{" "}
                        reviews
                      </span>

                    </div>

                  )}

              </div>


              {/* ==================================
                  REVIEW LIST
              ================================== */}

              {loadingReviews[
                selectedService._id
              ] ? (

                <div className="reviews-loading">
                  Loading reviews...
                </div>

              ) : serviceReviews[
                  selectedService._id
                ] &&
                serviceReviews[
                  selectedService._id
                ].totalReviews > 0 ? (

                <div className="service-review-list">

                  {serviceReviews[
                    selectedService._id
                  ].reviews.map(
                    (review) => (

                      <article
                        className="service-review-card"
                        key={review._id}
                      >

                        <div className="service-review-top">

                          <div className="customer-review-avatar">
                            {review.customerName
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>


                          <div>

                            <h4>
                              {
                                review.customerName
                              }
                            </h4>

                            <div className="review-stars">

                              {[1, 2, 3, 4, 5].map(
                                (star) => (

                                  <Star
                                    key={star}
                                    size={14}
                                    fill={
                                      star <=
                                      review.rating
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />

                                )
                              )}

                            </div>

                          </div>


                          <time>
                            {new Date(
                              review.createdAt
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </time>

                        </div>


                        <p>
                          {review.review}
                        </p>

                      </article>

                    )
                  )}

                </div>

              ) : (

                <div className="no-service-reviews">

                  <Star size={30} />

                  <h4>
                    No reviews yet
                  </h4>

                  <p>
                    Be the first customer to
                    review this service after
                    your appointment.
                  </p>

                </div>

              )}

            </section>
          )}


          {/* ==================================
              STEP 2 - DATE & TIME
          ================================== */}

          {selectedService && (

            <section className="booking-panel">

              <div className="booking-panel-header">

                <div>

                  <p className="step-number">
                    STEP 2
                  </p>

                  <h2>
                    Choose date & time
                  </h2>

                  <p className="muted">
                    Select an available
                    appointment slot.
                  </p>

                </div>

                <CalendarDays />

              </div>


              {/* ==============================
                  DATE
              ============================== */}

              <div className="date-selection">

                <label>

                  Appointment date

                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toLocaleDateString(
                      "en-CA"
                    )}
                    onChange={(e) => {

                      setSelectedDate(
                        e.target.value
                      );

                      setSelectedTime("");

                      setError("");

                    }}
                  />

                </label>

              </div>


              {/* ==============================
                  TIME SLOTS
              ============================== */}

              {selectedDate && (

                <div className="slot-section">

                  <h3>
                    Available times
                  </h3>


                  {loadingSlots ? (

                    <div className="slot-loading">

                      <div className="small-spinner"></div>

                      Loading available
                      times...

                    </div>

                  ) : slots.length === 0 ? (

                    <div className="no-slots">

                      <Clock3 size={22} />

                      <p>
                        No available slots
                        for this date.
                      </p>

                      <small>
                        Please choose another
                        date.
                      </small>

                    </div>

                  ) : (

                    <div className="time-slots">

                      {slots.map(
                        (slot) => (

                          <button
                            type="button"
                            key={
                              slot.value
                            }
                            className={
                              selectedTime ===
                              slot.value
                                ? "selected"
                                : ""
                            }
                            onClick={() =>
                              setSelectedTime(
                                slot.value
                              )
                            }
                          >
                            {slot.label}
                          </button>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}

            </section>

          )}


          {/* ==================================
              STEP 3 - CUSTOMER DETAILS
          ================================== */}

          {selectedService &&
            selectedDate &&
            selectedTime && (

              <section className="booking-panel">

                <div className="booking-panel-header">

                  <div>

                    <p className="step-number">
                      STEP 3
                    </p>

                    <h2>
                      Your details
                    </h2>

                    <p className="muted">
                      Enter your contact
                      information.
                    </p>

                  </div>

                </div>


                {/* ==============================
                    BOOKING SUMMARY
                ============================== */}

                <div className="selected-booking-summary">

                  <div>

                    <strong>
                      {
                        selectedService.name
                      }
                    </strong>

                    <span>
                      {new Date(
                        selectedTime
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          weekday:
                            "short",
                          day: "numeric",
                          month:
                            "short",
                          year:
                            "numeric",
                        }
                      )}
                    </span>

                    <span>
                      {new Date(
                        selectedTime
                      ).toLocaleTimeString(
                        "en-IN",
                        {
                          hour:
                            "2-digit",
                          minute:
                            "2-digit",
                        }
                      )}
                    </span>

                  </div>

                  <strong>
                    ₹
                    {
                      selectedService.price
                    }
                  </strong>

                </div>


                {/* ==============================
                    CUSTOMER FORM
                ============================== */}

                <form
                  className="customer-booking-form"
                  onSubmit={
                    bookAppointment
                  }
                >

                  <label>

                    Your name

                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={
                        customerName
                      }
                      onChange={(e) =>
                        setCustomerName(
                          e.target.value
                        )
                      }
                      required
                    />

                  </label>


                  <label>

                    Phone number

                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={
                        customerPhone
                      }
                      onChange={(e) =>
                        setCustomerPhone(
                          e.target.value
                        )
                      }
                      required
                    />

                  </label>


                  <button
                    className="primary booking-submit"
                    type="submit"
                  >

                    <CalendarDays
                      size={18}
                    />

                    Confirm appointment

                  </button>

                </form>

              </section>

            )}

        </div>

      </main>


      {/* ======================================
          FOOTER
      ====================================== */}

      <footer className="customer-footer">
        Powered by BookEasy
      </footer>

    </div>
  );
}

export default BookingPages;
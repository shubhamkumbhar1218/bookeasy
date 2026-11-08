import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  UserRound,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles
} from "lucide-react";

import "../styles/WelcomePage.css";
import BookEasyContact from "./BookEasyContact";

const bannerSlides = [
  {
    id: 1,
    theme: "blue",
    eyebrow: "WELCOME TO BOOKEASY",
    title: "Your Time. Your Booking.",
    description:
      "Discover local businesses and book appointments without waiting in queues.",
    button: "Explore Businesses",
    target: "customer",
    image:
      "https://www.saviojohnpereira.com/images/gallery/750x1000/28.jpg",
    imageAlt:
      "Indian hairstylist styling a woman's hair in a premium salon",
    visualTitle: "BOOK SMARTER",
    visualSubtitle: "Appointments made simple"
  },
  {
    id: 2,
    theme: "purple",
    eyebrow: "FOR BUSINESS OWNERS",
    title: "Grow Your Business with BookEasy",
    description:
      "Manage appointments, customers and your business from one simple platform.",
    button: "Register Your Business",
    target: "business",
    image:
      "https://www.wondergifts.in/cdn/shop/files/7830568894550-emotional_lifestyle_crop_700x.png?v=1775189611",
    imageAlt:
      "Woman enjoying a premium spa and beauty experience",
    visualTitle: "GROW YOUR BUSINESS",
    visualSubtitle: "Your business, your way"
  },
  {
    id: 3,
    theme: "teal",
    eyebrow: "ONLINE BOOKING",
    title: "Say Goodbye to Manual Bookings",
    description:
      "Let customers book your services online, anytime and from anywhere.",
    button: "Get Started",
    target: "business",
    image:
      "https://www.alphacoach.app/_next/image?q=75&url=%2F_next%2Fstatic%2Fmedia%2Fhome-banner3Mobile.d10a9047.jpg&w=1920",
    imageAlt:
      "Fitness trainer guiding a client at a modern gym",
    visualTitle: "BOOKINGS 24/7",
    visualSubtitle: "Never miss an appointment"
  },
  {
    id: 4,
    theme: "orange",
    eyebrow: "SMARTER MANAGEMENT",
    title: "Never Miss an Appointment",
    description:
      "Keep customers informed with automatic booking reminders and notifications.",
    button: "Discover BookEasy",
    target: "business",
    image:
      "https://scodclinic.com/assets/scod/expertise/doctor-consultation.png",
    imageAlt:
      "Doctor consulting a patient in a modern clinic",
    visualTitle: "STAY ORGANIZED",
    visualSubtitle: "Smart appointment reminders"
  },
  {
    id: 5,
    theme: "premium",
    eyebrow: "BOOKEASY PREMIUM",
    title: "Unlock More. Grow Faster.",
    description:
      "Get more powerful business tools with BookEasy Premium.",
    button: "Explore Premium",
    target: "business",
    image:
      "https://gujaratmanpowerservices.com/assets/mission-meeting-DB1Yvn32.png",
    imageAlt:
      "Indian professionals working together in a modern office",
    visualTitle: "PREMIUM MEMBERSHIP",
    visualSubtitle: "More tools. More possibilities.",
    pricing: true
  }
];

function WelcomePage() {
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleCustomer = () => {
    localStorage.setItem("bookeasy_role", "customer");
    navigate("/customer");
  };

  const handleBusiness = () => {
    localStorage.setItem("bookeasy_role", "business");
    navigate("/business/login");
  };

  const handleBannerAction = (target) => {
    if (target === "customer") {
      handleCustomer();
    } else if (target === "business") {
      handleBusiness();
    }
  };

  const nextSlide = () => {
    setCurrentSlide((previous) =>
      (previous + 1) % bannerSlides.length
    );
  };

  const previousSlide = () => {
    setCurrentSlide((previous) =>
      (previous - 1 + bannerSlides.length) % bannerSlides.length
    );
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Automatically change banners every 5 seconds.
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((previous) =>
        (previous + 1) % bannerSlides.length
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const activeBanner = bannerSlides[currentSlide];

  return (
    <div className="welcome-page">
      <div className="welcome-container">

        {/* Logo */}
        <div className="welcome-brand">
          <div className="welcome-brand-icon">
            <Store size={28} />
          </div>
          <span>BookEasy</span>
        </div>

        {/* AUTOMATIC BANNER SLIDER */}
        <section
          className={`welcome-banner banner-${activeBanner.theme}`}
          aria-label="BookEasy promotions"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPaused(false);
            }
          }}
        >
          <div className="welcome-banner-content" key={activeBanner.id}>
            <div className="banner-text-content">
              <span className="banner-eyebrow">
                {activeBanner.eyebrow}
              </span>

              <h2>{activeBanner.title}</h2>

              <p>{activeBanner.description}</p>

              {activeBanner.pricing && (
                <div className="banner-pricing">
                  <div className="banner-price-main">
                    <span>₹</span>
                    <strong>2,990</strong>
                    <span>/ year</span>
                  </div>

                  <div className="banner-price-details">
                    <span className="banner-old-price">
                      ₹3,588
                    </span>
                    <span className="banner-discount">
                      SAVE ₹598 · 17% OFF
                    </span>
                  </div>

                  <span className="banner-monthly-price">
                    Just ₹249.17/month when billed yearly
                  </span>

                  <span className="banner-monthly-comparison">
                    Monthly plan: ₹299/month
                  </span>
                </div>
              )}

              <button
                type="button"
                className="banner-cta"
                onClick={() =>
                  handleBannerAction(activeBanner.target)
                }
              >
                {activeBanner.button}
                <ArrowRight size={17} />
              </button>
            </div>

            {/* Banner Image */}
            <div className="banner-visual">
              <img
                className="banner-visual-image"
                src={activeBanner.image}
                alt={activeBanner.imageAlt}
                loading={currentSlide === 0 ? "eager" : "lazy"}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              <div className="banner-visual-overlay" />

              <div className="banner-visual-label">
                <strong>{activeBanner.visualTitle}</strong>
                <span>{activeBanner.visualSubtitle}</span>
              </div>

              {activeBanner.pricing && (
                <div className="banner-premium-tag">
                  <Sparkles size={15} />
                  PREMIUM
                </div>
              )}
            </div>
          </div>

          {/* Slider Controls */}
          <div className="banner-controls">
            <button
              type="button"
              className="banner-arrow"
              onClick={previousSlide}
              aria-label="Previous banner"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="banner-dots">
              {bannerSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`banner-dot ${
                    currentSlide === index ? "active" : ""
                  }`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to banner ${index + 1}`}
                  aria-current={
                    currentSlide === index ? "true" : undefined
                  }
                />
              ))}
            </div>

            <button
              type="button"
              className="banner-arrow"
              onClick={nextSlide}
              aria-label="Next banner"
            >
              <ChevronRight size={20} />
            </button>

            <button
              type="button"
              className="banner-pause"
              onClick={() =>
                setIsPaused((previous) => !previous)
              }
              aria-label={
                isPaused
                  ? "Resume automatic banners"
                  : "Pause automatic banners"
              }
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play size={15} />
              ) : (
                <Pause size={15} />
              )}
            </button>
          </div>
        </section>

        {/* Heading */}
        <div className="welcome-heading">
          <p className="welcome-eyebrow">
            LOCAL SERVICES, MADE EASY
          </p>

          <h1>Welcome to BookEasy</h1>

          <p>
            Find local businesses or manage
            appointments for your business.
          </p>
        </div>

        {/* Question */}
        <h2 className="welcome-question">
          What would you like to do?
        </h2>

        {/* Options */}
        <div className="welcome-options">

          {/* Customer */}
          <div
            className="welcome-card"
            onClick={handleCustomer}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleCustomer();
              }
            }}
          >
            <div className="welcome-card-icon customer-icon">
              <UserRound size={30} />
            </div>

            <div className="welcome-card-content">
              <h3>I'm a Customer</h3>
              <p>
                Find and book local businesses
                near you.
              </p>
            </div>

            <button
              className="welcome-button"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleCustomer();
              }}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Business Owner */}
          <div
            className="welcome-card"
            onClick={handleBusiness}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleBusiness();
              }
            }}
          >
            <div className="welcome-card-icon business-icon">
              <Store size={30} />
            </div>

            <div className="welcome-card-content">
              <h3>I'm a Business Owner</h3>
              <p>
                Manage your bookings and
                grow your local business.
              </p>
            </div>

            <button
              className="welcome-button"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleBusiness();
              }}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>

        </div>

        <p className="welcome-footer">
          No account needed to book an appointment.
        </p>

        <div className="legal-links">
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/refund-policy">
            Cancellation &amp; Refund Policy
          </a>
        </div>

        <BookEasyContact />

      </div>
    </div>
  );
}

export default WelcomePage;



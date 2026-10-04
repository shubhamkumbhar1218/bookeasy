import React from "react";
import { useNavigate } from "react-router-dom";
import { Store, UserRound, ArrowRight } from "lucide-react";
import "../styles/WelcomePage.css";

function WelcomePage() {
  const navigate = useNavigate();

  const handleCustomer = () => {
    localStorage.setItem("bookeasy_role", "customer");
    navigate("/customer");
  };

  const handleBusiness = () => {
    localStorage.setItem("bookeasy_role", "business");
    navigate("/business/login");
  };

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

        {/* Heading */}
        <div className="welcome-heading">
          <p className="welcome-eyebrow">
            LOCAL SERVICES, MADE EASY
          </p>

          <h1>
            Welcome to BookEasy
          </h1>

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
          >
            <div className="welcome-card-icon customer-icon">
              <UserRound size={30} />
            </div>

            <div className="welcome-card-content">
              <h3>
                I'm a Customer
              </h3>

              <p>
                Find and book local businesses
                near you.
              </p>
            </div>

            <button
              className="welcome-button"
              type="button"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Business Owner */}
          <div
            className="welcome-card"
            onClick={handleBusiness}
          >
            <div className="welcome-card-icon business-icon">
              <Store size={30} />
            </div>

            <div className="welcome-card-content">
              <h3>
                I'm a Business Owner
              </h3>

              <p>
                Manage your bookings and
                grow your local business.
              </p>
            </div>

            <button
              className="welcome-button"
              type="button"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>

        </div>

        <p className="welcome-footer">
          No account needed to book an appointment.
        </p>

      </div>
    </div>
  );
}

export default WelcomePage;
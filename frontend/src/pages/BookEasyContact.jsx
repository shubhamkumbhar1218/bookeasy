
import "../styles/BookEasyContact.css";

function BookEasyContact() {
  return (
    <section
      className="bookeasy-contact"
      aria-labelledby="bookeasy-contact-title"
    >
      <div className="bookeasy-contact__icon" aria-hidden="true">
        💬
      </div>

      <span className="bookeasy-contact__eyebrow">
        WE’RE HERE TO HELP
      </span>

      <h2 id="bookeasy-contact-title">
        Need a hand with <span>BookEasy?</span>
      </h2>

      <p className="bookeasy-contact__description">
        Have a question or need assistance? Our management team
        is just a message or call away.
      </p>

      <div className="bookeasy-contact__actions">
        <a
          className="bookeasy-contact__action bookeasy-contact__action--email"
          href="mailto:support.bookeasy@gmail.com"
        >
          <span className="bookeasy-contact__action-icon">✉</span>
          <span className="bookeasy-contact__action-text">
            <small>Email our team</small>
            <strong>support.bookeasy@gmail.com</strong>
          </span>
          <span className="bookeasy-contact__arrow" aria-hidden="true">
            ↗
          </span>
        </a>

        <a
          className="bookeasy-contact__action bookeasy-contact__action--phone"
          href="tel:+919022284532"
        >
          <span className="bookeasy-contact__action-icon">☎</span>
          <span className="bookeasy-contact__action-text">
            <small>Give us a call</small>
            <strong>+91 9022284532</strong>
          </span>
          <span className="bookeasy-contact__arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      </div>

      <div className="bookeasy-contact__footer">
        <span className="bookeasy-contact__status-dot" />
        Here to make your BookEasy experience easier
      </div>
    </section>
  );
}

export default BookEasyContact;

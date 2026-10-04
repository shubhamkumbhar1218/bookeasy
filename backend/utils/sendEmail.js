import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "BookEasy <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      throw new Error(error.message);
    }

    console.log("EMAIL SENT:", data);

    return data;
  } catch (error) {
    console.error("EMAIL SEND ERROR:", error);
    throw error;
  }
};

export default sendEmail;
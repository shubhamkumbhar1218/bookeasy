import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import createSlug from "../utils/createSlug.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      businessType,
      phone,
      address,
    } = req.body;

    if (!name || !email || !password || !businessName) {
      return res.status(400).json({
        message:
          "Name, email, password and business name are required",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    let businessSlug = createSlug(businessName);

    const existingSlug = await User.findOne({
      businessSlug,
    });

    if (existingSlug) {
      businessSlug = `${businessSlug}-${Date.now()}`;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      businessName,
      businessSlug,
      businessType,
      phone,
      address,
    });

const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);

    res.status(201).json({
      message: "Business registered successfully",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        businessSlug: user.businessSlug,
        businessType: user.businessType,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        businessSlug: user.businessSlug,
        businessType: user.businessType,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Forgot Password
// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    // Don't reveal whether email exists
    if (!user) {
      return res.json({
        message:
          "If this email is registered, a password reset link will be sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Hash token before storing in database
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedResetToken;

    // Token valid for 15 minutes
    user.resetPasswordExpires =
      Date.now() + 15 * 60 * 1000;

    await user.save();

    // Frontend reset page
    //  const resetUrl =
    //    `http://localhost:5173/reset-password/${resetToken}`;
const resetUrl =
  `bookeasy://business/reset-password/${resetToken}`;
    // Send email
    await sendEmail({
      to: user.email,

      subject: "BookEasy - Reset Your Password",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          border: 1px solid #ddd;
          border-radius: 10px;
        ">

          <h2 style="color: #111827;">
            BookEasy Password Reset
          </h2>

          <p>
            Hello ${user.name},
          </p>

          <p>
            We received a request to reset your BookEasy
            account password.
          </p>

          <p>
            Click the button below to create a new password:
          </p>

          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #111827;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
            Reset Password
          </a>

          <p style="margin-top: 25px;">
            This link will expire in 15 minutes.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

          <hr />

          <p style="color: #777; font-size: 13px;">
            © BookEasy
          </p>

        </div>
      `,
    });

    console.log("Password reset email sent to:", user.email);

    res.json({
      message:
        "If this email is registered, a password reset link will be sent.",
    });

  } catch (error) {
    console.log("Forgot password error:", error);

    res.status(500).json({
      message: "Unable to send password reset email",
    });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Reset link is invalid or has expired",
      });
    }

    user.password = await bcrypt.hash(
      password,
      10
    );

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


export default router;
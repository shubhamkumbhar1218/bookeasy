import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import createSlug from "../utils/createSlug.js";
import sendEmail from "../utils/sendEmail.js";
import { normalizeBusinessType } from "../utils/businessTypes.js";

const router = express.Router();

console.log("BOOKEASY AUTH ROUTE LOADED");

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

    
const normalizedBusinessType =
  normalizeBusinessType(businessType);

if (!normalizedBusinessType) {
  return res.status(400).json({
    success: false,
    message: "Please select a valid business category.",
    field: "businessType",
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
      businessType: normalizedBusinessType,
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
    role: user.role,
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
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Do not reveal whether an account exists.
    if (!user) {
      return res.json({
        message:
          "If this email is registered, a password reset link will be sent.",
      });
    }

    // Generate a secure reset token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token in the database.
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    // Use your deployed frontend's actual reset-password route.
    const resetUrl =
      `https://bookeasy-zeta.vercel.app/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "BookEasy - Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
          <h2>BookEasy Password Reset</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>We received a request to reset your BookEasy password.</p>
          <p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
              Reset Password
            </a>
          </p>
          <p>This link expires in 15 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    console.log("Password reset email sent to:", user.email);

    return res.json({
      message:
        "If this email is registered, a password reset link will be sent.",
    });
  } catch (error) {
    // Log the actual server-side error for diagnosis.
    console.error("Forgot password error:", error);

    return res.status(500).json({
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
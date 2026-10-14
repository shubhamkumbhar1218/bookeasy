
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function createAdmin() {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGO_URI } =
      process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !MONGO_URI) {
      throw new Error(
        "Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD and MONGO_URI first."
      );
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("Use an admin password with at least 12 characters.");
    }

    await mongoose.connect(MONGO_URI);

    const email = ADMIN_EMAIL.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [
        { email },
        { businessSlug: "bookeasy-platform-admin" },
      ],
    });

    if (existingUser) {
      throw new Error(
        "An account already uses this email or admin slug. No account was changed."
      );
    }

    const password = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      password,
      role: "ADMIN",
      isActive: true,
      businessName: "BookEasy Administration",
      businessSlug: "bookeasy-platform-admin",
      businessType: "other",
      phone: "",
      address: "",
    });

    console.log("Admin account created successfully.");
    console.log("Admin email:", email);
    console.log("Open your app and log in with this account.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();

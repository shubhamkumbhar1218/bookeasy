import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

async function createAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const name = process.env.ADMIN_NAME || "BookEasy Admin";
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const rawPassword = process.env.ADMIN_PASSWORD;

    if (!mongoUri) {
      throw new Error("MONGO_URI or MONGODB_URI is missing from your .env file.");
    }

    if (!email || !rawPassword) {
      throw new Error(
        "Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script."
      );
    }

    if (rawPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const existingUser = await User.findOne({
      $or: [
        { email },
        { businessSlug: "bookeasy-platform-admin" },
      ],
    });

    if (existingUser) {
      throw new Error(
        "An account with this email or the reserved admin slug already exists. No account was changed."
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      businessName: "BookEasy Administration",
      businessSlug: "bookeasy-platform-admin",
      businessType: "other",
      phone: "",
      address: "",
    });

    console.log("Admin account created successfully.");
    console.log("Admin email:", admin.email);
    console.log("Role:", admin.role);
    console.log("You can now log in at http://localhost:5173/business/login");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();

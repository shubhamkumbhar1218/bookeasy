import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/business.js";
import serviceRoutes from "./routes/services.js";
import bookingRoutes from "./routes/bookings.js";
import notificationRoutes from "./routes/notifications.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import pushTokenRoutes from "./routes/pushToken.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import staffRoutes from "./routes/staff.js";
import retentionRoutes from "./routes/retention.js";
import {
  startAppointmentExpiryScheduler,
} from "./utils/appointmentExpiryScheduler.js";
import {
  startSubscriptionReminderScheduler,
} from "./utils/subscriptionReminderScheduler.js";
import {
  startAppointmentReminderScheduler,
} from "./utils/appointmentReminderScheduler.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buffer) => {
      req.rawBody = buffer.toString("utf8");
    },
  })
);

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security headers
app.use(helmet());

// ========================================
// TEST ROUTE
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookEasy API is working 🚀",
  });
});

// ========================================
// API ROUTES
// ========================================

app.use("/api/auth", authRoutes);

app.use("/api/business", businessRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/services", serviceRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/staff", staffRoutes);

app.use("/api/retention", retentionRoutes);

app.use(
  "/api/push-tokens",
  pushTokenRoutes
);

// ========================================
// RATE LIMITING
// ========================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message:
      "Too many authentication attempts. Please try again later.",
  },
});

app.use("/api/auth/login", authLimiter);

app.use("/api/auth/register", authLimiter);

app.use("/api/auth/forgot-password", authLimiter);

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    console.log(
      "BookEasy database name:",
      mongoose.connection.name
    );

startAppointmentReminderScheduler();
startSubscriptionReminderScheduler();
startAppointmentExpiryScheduler();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`BookEasy server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

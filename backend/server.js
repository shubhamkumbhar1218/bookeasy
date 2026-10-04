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

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(
  express.json({
    limit: "100kb",
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

app.use("/api/services", serviceRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/reviews", reviewRoutes);

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

// ========================================
// MONGODB + SERVER
// ========================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`BookEasy server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
// import jwt from "jsonwebtoken";

// const authMiddleware = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         message: "Authentication required",
//       });
//     }

//     if (!authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         message: "Invalid authorization format",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({
//         message: "Authentication token missing",
//       });
//     }

//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET
//     );

//     if (!decoded.id) {
//       return res.status(401).json({
//         message: "Invalid authentication token",
//       });
//     }

//     req.user = decoded;

//     next();
//   } catch (error) {
//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         message: "Authentication token expired",
//       });
//     }

//     return res.status(401).json({
//       message: "Invalid authentication token",
//     });
//   }
// };

// export default authMiddleware;


import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token missing",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.id) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    const user = await User.findById(decoded.id).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!user) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role || "BUSINESS",
      name: user.name,
      email: user.email,
      businessName: user.businessName,
      businessSlug: user.businessSlug,
    };

    next();
  } catch (error) {
    console.error("JWT authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Authentication token expired",
      });
    }

    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }
};

export default authMiddleware;
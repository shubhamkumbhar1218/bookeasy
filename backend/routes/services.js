// import express from "express";
// import Service from "../models/Service.js";
// import authMiddleware from "../middleware/authMiddleware.js";

// const router = express.Router();

// // Add a service
// router.post("/", authMiddleware, async (req, res) => {
//   try {
//     const {
//       businessId,
//       name,
//       description,
//       price,
//       duration,
//     } = req.body;

//     if (!businessId || !name || !price || !duration) {
//       return res.status(400).json({
//         message: "businessId, name, price and duration are required",
//       });
//     }

//     const service = await Service.create({
//       businessId,
//       name,
//       description,
//       price,
//       duration,
//     });

//     res.status(201).json({
//       message: "Service created successfully",
//       service,
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });

// // Get services for a business
// router.get("/:businessId", async (req, res) => {
//   try {
//     const services = await Service.find({
//       businessId: req.params.businessId,
//       isActive: true,
//     });

//     res.json(services);
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });


// // Update a service
// router.patch("/:id", authMiddleware, async (req, res) => {
//   try {
//     const {
//       name,
//       description,
//       price,
//       duration,
//     } = req.body;

//     if (!name || !price || !duration) {
//       return res.status(400).json({
//         message: "Name, price and duration are required",
//       });
//     }

//     const service = await Service.findByIdAndUpdate(
//       req.params.id,
//       {
//         name,
//         description,
//         price,
//         duration,
//       },
//       {
//         new: true,
//         runValidators: true,
//       }
//     );

//     if (!service) {
//       return res.status(404).json({
//         message: "Service not found",
//       });
//     }

//     res.json({
//       message: "Service updated successfully",
//       service,
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });


// // Delete a service
// router.delete("/:id", authMiddleware, async (req, res) => {
//   try {
//     const service = await Service.findByIdAndUpdate(
//       req.params.id,
//       {
//         isActive: false,
//       },
//       {
//         new: true,
//       }
//     );

//     if (!service) {
//       return res.status(404).json({
//         message: "Service not found",
//       });
//     }

//     res.json({
//       message: "Service deleted successfully",
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });
// export default router;

import express from "express";
import mongoose from "mongoose";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================================
// CREATE SERVICE
// POST /api/services
// ======================================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      businessId,
      name,
      description,
      price,
      duration,
    } = req.body;

    if (!businessId || !name || !price || !duration) {
      return res.status(400).json({
        message:
          "businessId, name, price and duration are required",
      });
    }

    const service = await Service.create({
      businessId,
      name,
      description,
      price,
      duration,
    });

    res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.log("CREATE SERVICE ERROR:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// GET ACTIVE SERVICES FOR BUSINESS
// GET /api/services/:businessId
// ======================================================
router.get("/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        message: "Invalid business ID",
      });
    }

    // Get only active services
    const services = await Service.find({
      businessId,
      isActive: true,
    }).lean();

    if (services.length === 0) {
      return res.json([]);
    }

    // Get IDs of these exact services
    const serviceIds = services.map(
      (service) => service._id
    );

    // Get reviews grouped by SERVICE
    const ratingStats = await Review.aggregate([
      {
        $match: {
          serviceId: {
            $in: serviceIds,
          },
        },
      },
      {
        $group: {
          _id: "$serviceId",
          totalReviews: {
            $sum: 1,
          },
          averageRating: {
            $avg: "$rating",
          },
        },
      },
    ]);

    // Create:
    // serviceId -> rating information
    const ratingMap = new Map();

    ratingStats.forEach((item) => {
      ratingMap.set(String(item._id), {
        totalReviews: item.totalReviews,
        averageRating: Number(
          Number(item.averageRating).toFixed(1)
        ),
      });
    });

    // Attach ONLY that service's rating
    const servicesWithRatings = services.map(
      (service) => {
        const rating = ratingMap.get(
          String(service._id)
        );

        return {
          ...service,

          averageRating:
            rating?.averageRating || 0,

          totalReviews:
            rating?.totalReviews || 0,
        };
      }
    );

    res.json(servicesWithRatings);
  } catch (error) {
    console.log("GET SERVICES ERROR:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// UPDATE SERVICE
// PATCH /api/services/:id
// ======================================================
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
    } = req.body;

    if (!name || !price || !duration) {
      return res.status(400).json({
        message:
          "Name, price and duration are required",
      });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        duration,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    res.json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    console.log("UPDATE SERVICE ERROR:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// DELETE SERVICE
// DELETE /api/services/:id
// ======================================================
router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const service =
        await Service.findByIdAndUpdate(
          req.params.id,
          {
            isActive: false,
          },
          {
            new: true,
          }
        );

      if (!service) {
        return res.status(404).json({
          message: "Service not found",
        });
      }

      res.json({
        message: "Service deleted successfully",
      });
    } catch (error) {
      console.log("DELETE SERVICE ERROR:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export default router;
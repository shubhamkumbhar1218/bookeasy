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
  slotIntervalMinutes = 30,
  bufferMinutes = 0,
} = req.body;



if (
  !businessId ||
  !name?.trim() ||
  price === undefined ||
  price === null ||
  !Number.isFinite(Number(price)) ||
  Number(price) < 0 ||
  duration === undefined ||
  duration === null ||
  !Number.isFinite(Number(duration)) ||
  ![15, 20, 30, 45, 60].includes(Number(duration)) ||
  ![5, 10, 15, 20, 30].includes(Number(slotIntervalMinutes)) ||
  ![0, 5, 10, 15].includes(Number(bufferMinutes))
) {
  return res.status(400).json({
    message:
      "Provide a valid businessId, name, price, duration, slot interval and buffer",
  });
}



const service = await Service.create({
  businessId,
  name,
  description,
  price: Number(price),
  duration: Number(duration),
  slotIntervalMinutes: Number(slotIntervalMinutes),
  bufferMinutes: Number(bufferMinutes),
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
  slotIntervalMinutes = 30,
  bufferMinutes = 0,
} = req.body;



if (
  !name?.trim() ||
  price === undefined ||
  price === null ||
  !Number.isFinite(Number(price)) ||
  Number(price) < 0 ||
  duration === undefined ||
  duration === null ||
  !Number.isFinite(Number(duration)) ||
  ![15, 20, 30, 45, 60].includes(Number(duration)) ||
  ![5, 10, 15, 20, 30].includes(Number(slotIntervalMinutes)) ||
  ![0, 5, 10, 15].includes(Number(bufferMinutes))
) {
  return res.status(400).json({
    message:
      "Provide a valid name, price, duration, slot interval and buffer",
  });
}



const service = await Service.findByIdAndUpdate(
  req.params.id,
  {
    name: name.trim(),
    description,
    price: Number(price),
    duration: Number(duration),
    slotIntervalMinutes: Number(slotIntervalMinutes),
    bufferMinutes: Number(bufferMinutes),
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
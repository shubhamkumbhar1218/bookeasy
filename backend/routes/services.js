import express from "express";
import Service from "../models/Service.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Add a service
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
        message: "businessId, name, price and duration are required",
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
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get services for a business
router.get("/:businessId", async (req, res) => {
  try {
    const services = await Service.find({
      businessId: req.params.businessId,
      isActive: true,
    });

    res.json(services);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Update a service
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
        message: "Name, price and duration are required",
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
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Delete a service
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
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
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});
export default router;
// import express from "express";
// import User from "../models/User.js";
// import Service from "../models/Service.js";
// import Review from "../models/Review.js";
// import authMiddleware from "../middleware/authMiddleware.js";

// const router = express.Router();

// // ======================================================
// // SEARCH BUSINESSES + SERVICES - CUSTOMER
// // ======================================================

// router.get("/search", async (req, res) => {
//   try {
//     const { search, location, category } = req.query;

//     const searchText =
//       search?.trim() || location?.trim() || "";

//     // --------------------------------------------------
//     // Find services matching search text
//     // --------------------------------------------------

//     let matchingServiceBusinessIds = [];
//     let matchingServiceIds = [];

//     if (searchText) {
//       const matchingServices = await Service.find({
//         name: {
//           $regex: searchText,
//           $options: "i",
//         },
//         isActive: true,
//       }).select("_id businessId");

//       matchingServiceBusinessIds =
//         matchingServices.map(
//           (service) => service.businessId
//         );

//       matchingServiceIds =
//         matchingServices.map(
//           (service) => service._id.toString()
//         );
//     }

//     // --------------------------------------------------
//     // Business search
//     // Business name OR address OR service name
//     // --------------------------------------------------

//     const query = {};

//     if (searchText) {
//       query.$or = [
//         {
//           businessName: {
//             $regex: searchText,
//             $options: "i",
//           },
//         },
//         {
//           address: {
//             $regex: searchText,
//             $options: "i",
//           },
//         },
//       ];

//       // Add businesses that have matching services
//       if (matchingServiceBusinessIds.length > 0) {
//         query.$or.push({
//           _id: {
//             $in: matchingServiceBusinessIds,
//           },
//         });
//       }
//     }

//     // --------------------------------------------------
//     // Search by category
//     // --------------------------------------------------

//     if (
//       category &&
//       category.trim() &&
//       category.toLowerCase() !== "all"
//     ) {
//       query.businessType = {
//         $regex: `^${category.trim()}$`,
//         $options: "i",
//       };
//     }

//     // --------------------------------------------------
//     // Find businesses
//     // --------------------------------------------------

//     const businesses = await User.find(query)
//       .select(
//         "businessName businessSlug businessType phone address name workingHours"
//       )
//       .sort({ businessName: 1 });

//     // --------------------------------------------------
//     // Add services + ratings to every business
//     // --------------------------------------------------

//     const businessesWithServices =
//       await Promise.all(
//         businesses.map(async (business) => {
//           let serviceQuery = {
//             businessId: business._id,
//             isActive: true,
//           };

//           // If customer searched something,
//           // show matching services when search matches
//           // a service name.
//           if (
//             searchText &&
//             matchingServiceIds.length > 0
//           ) {
//             const businessHasMatchingService =
//               matchingServiceBusinessIds.some(
//                 (id) =>
//                   id.toString() ===
//                   business._id.toString()
//               );

//             // If this business was found because of
//             // its service, only show matching services.
//             if (businessHasMatchingService) {
//               serviceQuery._id = {
//                 $in: matchingServiceIds,
//               };
//             }
//           }

//           const services = await Service.find(
//             serviceQuery
//           )
//             .select(
//               "_id businessId name description price duration isActive"
//             )
//             .sort({ name: 1 });

//           // ------------------------------------------------
//           // Get ratings for all services
//           // ------------------------------------------------

//           const serviceIds = services.map(
//             (service) => service._id
//           );

//           const reviewStats =
//             serviceIds.length > 0
//               ? await Review.aggregate([
//                   {
//                     $match: {
//                       serviceId: {
//                         $in: serviceIds,
//                       },
//                     },
//                   },
//                   {
//                     $group: {
//                       _id: "$serviceId",
//                       averageRating: {
//                         $avg: "$rating",
//                       },
//                       totalReviews: {
//                         $sum: 1,
//                       },
//                     },
//                   },
//                 ])
//               : [];

//           const ratingMap = {};

//           reviewStats.forEach((item) => {
//             ratingMap[item._id.toString()] = {
//               averageRating: Number(
//                 item.averageRating.toFixed(1)
//               ),
//               totalReviews: item.totalReviews,
//             };
//           });

//           const servicesWithRatings =
//             services.map((service) => {
//               const rating =
//                 ratingMap[
//                   service._id.toString()
//                 ];

//               return {
//                 ...service.toObject(),

//                 averageRating:
//                   rating?.averageRating || 0,

//                 totalReviews:
//                   rating?.totalReviews || 0,
//               };
//             });

//           return {
//             ...business.toObject(),
//             services: servicesWithRatings,
//           };
//         })
//       );

//     // --------------------------------------------------
//     // Remove businesses that have no active services
//     // --------------------------------------------------

//     const businessesWithActiveServices =
//       businessesWithServices.filter(
//         (business) =>
//           business.services.length > 0
//       );

//     res.json({
//       count:
//         businessesWithActiveServices.length,

//       businesses:
//         businessesWithActiveServices,
//     });
//   } catch (error) {
//     console.log(
//       "Business search error:",
//       error
//     );

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });

// // ======================================================
// // GET LOGGED-IN BUSINESS PROFILE
// // ======================================================

// router.get(
//   "/profile/me",
//   authMiddleware,
//   async (req, res) => {
//     try {
//       const user = await User.findById(
//         req.userId
//       ).select("-password");

//       if (!user) {
//         return res.status(404).json({
//           message: "User not found",
//         });
//       }

//       res.json(user);
//     } catch (error) {
//       console.log(error);

//       res.status(500).json({
//         message: "Server error",
//       });
//     }
//   }
// );

// // ======================================================
// // UPDATE LOGGED-IN BUSINESS PROFILE
// // ======================================================

// router.patch(
//   "/profile/me",
//   authMiddleware,
//   async (req, res) => {
//     try {
//       const {
//         name,
//         businessName,
//         businessType,
//         phone,
//         address,
//         workingHours,
//       } = req.body;

//       if (!name || !businessName) {
//         return res.status(400).json({
//           message:
//             "Name and business name are required",
//         });
//       }

//       const user = await User.findById(
//         req.userId
//       );

//       if (!user) {
//         return res.status(404).json({
//           message: "User not found",
//         });
//       }

//       user.name = name.trim();
//       user.businessName =
//         businessName.trim();

//       user.businessType =
//         businessType || "other";

//       user.phone = phone || "";
//       user.address = address || "";

//       if (workingHours) {
//         user.workingHours = workingHours;
//       }

//       await user.save();

//       res.json({
//         message:
//           "Business profile updated successfully",

//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           businessName:
//             user.businessName,
//           businessSlug:
//             user.businessSlug,
//           businessType:
//             user.businessType,
//           phone: user.phone,
//           address: user.address,
//           workingHours:
//             user.workingHours,
//         },
//       });
//     } catch (error) {
//       console.log(error);

//       res.status(500).json({
//         message: "Server error",
//       });
//     }
//   }
// );

// // ======================================================
// // PUBLIC BUSINESS INFORMATION
// // ======================================================

// router.get("/:slug", async (req, res) => {
//   try {
//     const business = await User.findOne({
//       businessSlug: req.params.slug,
//     }).select(
//       "businessName businessSlug businessType phone address name workingHours"
//     );

//     if (!business) {
//       return res.status(404).json({
//         message: "Business not found",
//       });
//     }

//     res.json(business);
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });

// export default router;


import express from "express";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================================
// SEARCH BUSINESSES + SERVICES + RATINGS
// ======================================================

router.get("/search", async (req, res) => {
  try {
    const { search, location, category } = req.query;

    const searchText =
      search?.trim() || location?.trim() || "";

    // --------------------------------------------------
    // Find services matching search text
    // --------------------------------------------------

    let matchingServiceBusinessIds = [];
    let matchingServiceIds = [];

    if (searchText) {
      const matchingServices = await Service.find({
        name: {
          $regex: searchText,
          $options: "i",
        },
        isActive: true,
      }).select("_id businessId");

      matchingServiceBusinessIds =
        matchingServices.map(
          (service) => service.businessId
        );

      matchingServiceIds =
        matchingServices.map(
          (service) => service._id.toString()
        );
    }

    // --------------------------------------------------
    // Business search
    // Business name OR address OR service name
    // --------------------------------------------------

    const query = {};

    if (searchText) {
      query.$or = [
        {
          businessName: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          address: {
            $regex: searchText,
            $options: "i",
          },
        },
      ];

      if (matchingServiceBusinessIds.length > 0) {
        query.$or.push({
          _id: {
            $in: matchingServiceBusinessIds,
          },
        });
      }
    }

    // --------------------------------------------------
    // Search by category
    // --------------------------------------------------

    if (
      category &&
      category.trim() &&
      category.toLowerCase() !== "all"
    ) {
      query.businessType = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    // --------------------------------------------------
    // Find businesses
    // --------------------------------------------------

    const businesses = await User.find(query)
      .select(
        "businessName businessSlug businessType phone address name workingHours"
      )
      .sort({ businessName: 1 });

    // --------------------------------------------------
    // Add services + service ratings
    // + business overall rating
    // --------------------------------------------------

    const businessesWithServices =
      await Promise.all(
        businesses.map(async (business) => {
          // ============================================
          // SERVICES
          // ============================================

          let serviceQuery = {
            businessId: business._id,
            isActive: true,
          };

          // If customer searched by service name,
          // show matching services for that business.
          if (
            searchText &&
            matchingServiceIds.length > 0
          ) {
            const businessHasMatchingService =
              matchingServiceBusinessIds.some(
                (id) =>
                  id.toString() ===
                  business._id.toString()
              );

            if (businessHasMatchingService) {
              serviceQuery._id = {
                $in: matchingServiceIds,
              };
            }
          }

          const services = await Service.find(
            serviceQuery
          )
            .select(
              "_id businessId name description price duration isActive"
            )
            .sort({ name: 1 });

          // ============================================
          // SERVICE RATINGS
          // ============================================

          const serviceIds = services.map(
            (service) => service._id
          );

          const reviewStats =
            serviceIds.length > 0
              ? await Review.aggregate([
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

                      averageRating: {
                        $avg: "$rating",
                      },

                      totalReviews: {
                        $sum: 1,
                      },
                    },
                  },
                ])
              : [];

          const ratingMap = {};

          reviewStats.forEach((item) => {
            ratingMap[item._id.toString()] = {
              averageRating: Number(
                item.averageRating.toFixed(1)
              ),

              totalReviews:
                item.totalReviews,
            };
          });

          const servicesWithRatings =
            services.map((service) => {
              const rating =
                ratingMap[
                  service._id.toString()
                ];

              return {
                ...service.toObject(),

                averageRating:
                  rating?.averageRating || 0,

                totalReviews:
                  rating?.totalReviews || 0,
              };
            });

          // ============================================
          // BUSINESS OVERALL RATING
          // ============================================

          const businessRating =
            await Review.aggregate([
              {
                $match: {
                  businessId:
                    business._id,
                },
              },
              {
                $group: {
                  _id: null,

                  averageRating: {
                    $avg: "$rating",
                  },

                  totalReviews: {
                    $sum: 1,
                  },
                },
              },
            ]);

          let businessAverageRating = 0;
          let businessTotalReviews = 0;

          if (
            businessRating.length > 0
          ) {
            businessAverageRating =
              Number(
                businessRating[0].averageRating.toFixed(
                  1
                )
              );

            businessTotalReviews =
              businessRating[0].totalReviews;
          }

          // ============================================
          // FINAL BUSINESS OBJECT
          // ============================================

          return {
            ...business.toObject(),

            services:
              servicesWithRatings,

            averageRating:
              businessAverageRating,

            totalReviews:
              businessTotalReviews,
          };
        })
      );

    // --------------------------------------------------
    // Remove businesses with no active services
    // --------------------------------------------------

    const businessesWithActiveServices =
      businessesWithServices.filter(
        (business) =>
          business.services.length > 0
      );

    res.json({
      count:
        businessesWithActiveServices.length,

      businesses:
        businessesWithActiveServices,
    });
  } catch (error) {
    console.log(
      "Business search error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// GET LOGGED-IN BUSINESS PROFILE
// ======================================================

router.get(
  "/profile/me",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json(user);
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// UPDATE LOGGED-IN BUSINESS PROFILE
// ======================================================

router.patch(
  "/profile/me",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        name,
        businessName,
        businessType,
        phone,
        address,
        workingHours,
      } = req.body;

      if (!name || !businessName) {
        return res.status(400).json({
          message:
            "Name and business name are required",
        });
      }

      const user = await User.findById(
        req.user.id
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      user.name = name.trim();
      user.businessName =
        businessName.trim();

      user.businessType =
        businessType || "other";

      user.phone = phone || "";
      user.address = address || "";

      if (workingHours) {
        user.workingHours = workingHours;
      }

      await user.save();

      res.json({
        message:
          "Business profile updated successfully",

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName:
            user.businessName,
          businessSlug:
            user.businessSlug,
          businessType:
            user.businessType,
          phone: user.phone,
          address: user.address,
          workingHours:
            user.workingHours,
        },
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// PUBLIC BUSINESS INFORMATION
// ======================================================

router.get("/:slug", async (req, res) => {
  try {
    const business = await User.findOne({
      businessSlug: req.params.slug,
    }).select(
      "businessName businessSlug businessType phone address name workingHours"
    );

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    res.json(business);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
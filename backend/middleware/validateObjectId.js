import mongoose from "mongoose";

const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName}`,
      });
    }

    next();
  };
};

router.get(
  "/:id",
  validateObjectId("id"),
  async (req, res) => {
    // ...
  }
); 
export default validateObjectId;
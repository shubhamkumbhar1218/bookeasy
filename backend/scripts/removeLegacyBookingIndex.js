
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const TARGET_INDEX =
  "businessId_1_bookingSlot_1_staffId_1";

try {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const collection =
    mongoose.connection.db.collection("bookings");

  const indexes = await collection.indexes();

  const target = indexes.find(
    (index) => index.name === TARGET_INDEX
  );

  if (!target) {
    console.log("Legacy index not found. Nothing to remove.");
  } else {
    const keys = Object.entries(target.key);

    const expected =
      "businessId:1,bookingSlot:1,staffId:1";

    const actual = keys
      .map(([key, value]) => `${key}:${value}`)
      .join(",");

    if (
      actual !== expected ||
      target.unique !== true ||
      !target.partialFilterExpression
    ) {
      throw new Error(
        "Index definition mismatch. Removal stopped."
      );
    }

    await collection.dropIndex(TARGET_INDEX);

    console.log("Legacy index removed successfully.");
  }

  const remaining = await collection.indexes();

  console.log("\nRemaining booking indexes:");

  remaining.forEach((index) =>
    console.log(index.name)
  );

  const replacementExists = remaining.some(
    (index) =>
      index.name ===
      "unique_unassigned_business_booking_slot"
  );

  if (!replacementExists) {
    throw new Error("Replacement index is missing.");
  }

  console.log("\nReplacement index verified.");
} catch (error) {
  console.error("INDEX REMOVAL FAILED:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  console.log("MongoDB connection closed.");
}

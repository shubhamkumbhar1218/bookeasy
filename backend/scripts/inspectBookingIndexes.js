
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

try {
  await mongoose.connect(process.env.MONGO_URI);

  const indexes = await mongoose.connection.db
    .collection("bookings")
    .indexes();

  for (const index of indexes) {
    if (
      index.name ===
      "businessId_1_bookingSlot_1_staffId_1"
    ) {
      console.log(
        JSON.stringify(index, null, 2)
      );
    }
  }
} catch (error) {
  console.error(error);
} finally {
  await mongoose.disconnect();
}

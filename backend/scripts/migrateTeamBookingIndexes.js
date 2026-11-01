
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const LOCK_COLLECTION = "booking_slot_locks";
const BOOKING_COLLECTION = "bookings";

const OLD_BOOKING_INDEX_KEY = {
  businessId: 1,
  bookingSlot: 1,
};

const NEW_BOOKING_INDEX_NAME =
  "unique_unassigned_business_booking_slot";

const NEW_BOOKING_INDEX_OPTIONS = {
  unique: true,
  name: NEW_BOOKING_INDEX_NAME,
  partialFilterExpression: {
    status: {
      $in: ["pending", "confirmed"],
    },
    bookingSlot: {
      $type: "string",
    },
    assignedStaffId: null,
  },
};

const lockIndexes = [
  {
    key: {
      staffId: 1,
      minuteStart: 1,
    },
    options: {
      unique: true,
      name: "unique_staff_minute_lock",
    },
  },
  {
    key: {
      bookingId: 1,
    },
    options: {
      name: "booking_lock_lookup",
    },
  },
{
  key: {
    businessId: 1,
    minuteStart: 1,
  },
  options: {
    name: "businessId_1_minuteStart_1",
  },
},
];

const sameIndexKey = (first, second) => {
  const firstEntries = Object.entries(first);
  const secondEntries = Object.entries(second);

  return (
    firstEntries.length === secondEntries.length &&
    firstEntries.every(
      ([key, value], index) =>
        key === secondEntries[index][0] &&
        value === secondEntries[index][1]
    )
  );
};

const runMigration = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from backend/.env"
    );
  }

  console.log("Connecting to MongoDB...");

  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
  });

  const db = mongoose.connection.db;

  console.log("MongoDB connected.");

  // --------------------------------------------------
  // CHECK BOOKING COLLECTION
  // --------------------------------------------------

  const bookingCollection = db.collection(
    BOOKING_COLLECTION
  );

  const collectionExists = await db
    .listCollections({
      name: BOOKING_COLLECTION,
    })
    .hasNext();

  if (!collectionExists) {
    throw new Error(
      "Bookings collection does not exist. Migration stopped."
    );
  }

  // Do not migrate silently if active assigned bookings
  // already exist. They would need their locks backfilled.
  const assignedActiveCount =
    await bookingCollection.countDocuments({
      status: {
        $in: ["pending", "confirmed"],
      },
      assignedStaffId: {
        $exists: true,
        $ne: null,
      },
    });

  if (assignedActiveCount > 0) {
    throw new Error(
      `${assignedActiveCount} active assigned bookings found. ` +
      "Migration stopped. These bookings need lock backfilling first."
    );
  }

  console.log(
    "Preflight passed: no active assigned bookings require backfilling."
  );

  // --------------------------------------------------
  // CREATE STAFF LOCK COLLECTION
  // --------------------------------------------------

  const lockCollectionExists = await db
    .listCollections({
      name: LOCK_COLLECTION,
    })
    .hasNext();

  if (!lockCollectionExists) {
    await db.createCollection(LOCK_COLLECTION);
    console.log("Created booking_slot_locks collection.");
  } else {
    console.log(
      "booking_slot_locks collection already exists."
    );
  }

  const lockCollection = db.collection(LOCK_COLLECTION);

  // --------------------------------------------------
  // CREATE STAFF LOCK INDEXES
  // --------------------------------------------------

  for (const index of lockIndexes) {
    await lockCollection.createIndex(
      index.key,
      index.options
    );

    console.log(
      `Verified lock index: ${index.options.name}`
    );
  }

  // --------------------------------------------------
  // INSPECT EXISTING BOOKING INDEXES
  // --------------------------------------------------

  const existingIndexes =
    await bookingCollection.indexes();

  const oldIndex = existingIndexes.find(
    (index) =>
      sameIndexKey(index.key, OLD_BOOKING_INDEX_KEY) &&
      index.unique === true &&
      index.name !== NEW_BOOKING_INDEX_NAME
  );

  const replacementAlreadyExists =
    existingIndexes.some(
      (index) =>
        index.name === NEW_BOOKING_INDEX_NAME
    );

  // --------------------------------------------------
  // REPLACE OLD BUSINESS-WIDE UNIQUE INDEX
  // --------------------------------------------------

  if (oldIndex) {
    console.log(
      `Old booking index found: ${oldIndex.name}`
    );

    // The old and new indexes have the same key pattern,
    // so MongoDB cannot keep both with different options.
    // Remove the old index before creating its replacement.
    await bookingCollection.dropIndex(oldIndex.name);

    console.log("Old booking index removed.");

    try {
      await bookingCollection.createIndex(
        OLD_BOOKING_INDEX_KEY,
        NEW_BOOKING_INDEX_OPTIONS
      );

      console.log(
        "New unassigned-booking index created."
      );
    } catch (indexError) {
      console.error(
        "New index creation failed. Attempting rollback..."
      );

      // Restore the original unique index if replacement
      // creation fails.
      try {
        await bookingCollection.createIndex(
          OLD_BOOKING_INDEX_KEY,
          {
            unique: true,
            name: oldIndex.name,
            ...(oldIndex.sparse
              ? { sparse: true }
              : {}),
            ...(oldIndex.partialFilterExpression
              ? {
                  partialFilterExpression:
                    oldIndex.partialFilterExpression,
                }
              : {}),
          }
        );

        console.log("Original booking index restored.");
      } catch (rollbackError) {
        console.error(
          "CRITICAL: Original index restoration failed:",
          rollbackError
        );
      }

      throw indexError;
    }
  } else if (!replacementAlreadyExists) {
    console.log(
      "No old unique booking index found. Creating replacement."
    );

    await bookingCollection.createIndex(
      OLD_BOOKING_INDEX_KEY,
      NEW_BOOKING_INDEX_OPTIONS
    );

    console.log(
      "New unassigned-booking index created."
    );
  } else {
    console.log(
      "Replacement booking index already exists."
    );
  }

  // --------------------------------------------------
  // VERIFY FINAL INDEXES
  // --------------------------------------------------

  const finalBookingIndexes =
    await bookingCollection.indexes();

  const finalLockIndexes =
    await lockCollection.indexes();

  const newBookingIndexFound =
    finalBookingIndexes.some(
      (index) =>
        index.name === NEW_BOOKING_INDEX_NAME &&
        index.unique === true
    );

  const staffLockIndexFound =
    finalLockIndexes.some(
      (index) =>
        index.name === "unique_staff_minute_lock" &&
        index.unique === true
    );

  if (!newBookingIndexFound || !staffLockIndexFound) {
    throw new Error(
      "Migration verification failed. Required unique indexes are missing."
    );
  }

  console.log("----------------------------------");
  console.log("TEAM MANAGEMENT MIGRATION VERIFIED");
  console.log("----------------------------------");

  console.log("Booking indexes:");
  console.log(
    finalBookingIndexes.map((index) => index.name)
  );

  console.log("Staff lock indexes:");
  console.log(
    finalLockIndexes.map((index) => index.name)
  );

  console.log("Migration completed successfully.");
};

runMigration()
  .catch((error) => {
    console.error("MIGRATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  });

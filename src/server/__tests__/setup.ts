import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("inventory_test")) {
  throw new Error(
    `Safety check failed: DATABASE_URL must point to 'inventory_test' database during tests! Current: ${process.env.DATABASE_URL}`
  );
}

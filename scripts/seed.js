// Run with: npm run seed
// Creates demo accounts so you can log in immediately without registering.
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const demoUsers = [
    { name: "Demo Customer", email: "customer@demo.com", password: "password123", role: "customer" },
    { name: "Demo Agent", email: "agent@demo.com", password: "password123", role: "agent" },
  ];

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`Skipping ${u.email} (already exists).`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ name: u.name, email: u.email, passwordHash, role: u.role });
    console.log(`Created ${u.role}: ${u.email} / ${u.password}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const User = require("../src/Models/User");
const connectDB = require("../src/Database/Connection");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const run = async () => {
  try {
    // Connect to Database
    await connectDB();

    console.log("\n=== Create SuperAdmin Profile ===\n");

    const username = await askQuestion("Enter username: ");
    if (!username.trim()) {
      console.error("Username cannot be empty.");
      process.exit(1);
    }

    const email = await askQuestion("Enter email: ");
    if (!email.trim() || !email.includes("@")) {
      console.error("Please enter a valid email.");
      process.exit(1);
    }

    const password = await askQuestion("Enter password: ");
    if (!password.trim() || password.length < 6) {
      console.error("Password must be at least 6 characters.");
      process.exit(1);
    }

    // Check if exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      console.error(
        "SuperAdmin/User with this username or email already exists.",
      );
      process.exit(1);
    }

    const superAdmin = new User({
      username,
      email,
      password,
      role: "SuperAdmin",
    });

    await superAdmin.save();
    console.log(`\n✔ SuperAdmin '${username}' created successfully!`);
  } catch (error) {
    console.error("Error creating SuperAdmin:", error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

run();

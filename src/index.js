require("dotenv").config();
const app = require("./app");
const connectDB = require("./Database/Connection");
const User = require("./Models/User");

const PORT = process.env.PORT || 3000;

const seedSuperAdmin = async () => {
  try {
    const count = await User.countDocuments({ role: "SuperAdmin" });
    if (count === 0) {
      const defaultSuperAdmin = new User({
        username: "superadmin",
        email: "superadmin@booking.com",
        password: "SuperAdmin123!",
        role: "SuperAdmin",
      });
      await defaultSuperAdmin.save();
      console.log("\n--- Default SuperAdmin Account Seeded ---");
      console.log("Username: superadmin");
      console.log("Email: superadmin@booking.com");
      console.log("Password: SuperAdmin123!");
      console.log("-------------------------------------------\n");
    }
  } catch (error) {
    console.error("Failed to seed default SuperAdmin:", error);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await seedSuperAdmin();
    app.listen(PORT, () => {
      console.log(`Server is running at ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

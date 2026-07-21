const mongoose = require('mongoose');
const SlotSettings = require('./src/Models/SlotSettings');
const connectDB = require('./src/Database/Connection');

const run = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const settings = await SlotSettings.findOne({ adminId: "6a5e194d152ba1720e057a94" });
    if (!settings) {
      console.log("Settings not found.");
      mongoose.disconnect();
      return;
    }

    console.log("Original workingDays Monday breaks:", JSON.stringify(settings.workingDays[0].breakTimes));

    // Update Monday to have a break
    settings.workingDays[0].breakTimes = [
      { name: "Test Programmatic Break", startTime: "12:00", endTime: "13:00" }
    ];

    await settings.save();
    console.log("Settings saved.");

    // Retrieve again to verify
    const updatedSettings = await SlotSettings.findOne({ adminId: "6a5e194d152ba1720e057a94" });
    console.log("After save - Monday breaks:", JSON.stringify(updatedSettings.workingDays[0].breakTimes));

    // Clean it back up
    updatedSettings.workingDays[0].breakTimes = [];
    await updatedSettings.save();
    console.log("Cleaned up settings.");

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

run();

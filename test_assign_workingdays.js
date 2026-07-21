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

    // Assign workingDays directly with nested breakTimes
    settings.workingDays = [
      {
        day: "Monday",
        isOpen: true,
        startTime: "09:00",
        endTime: "17:00",
        breakTimes: [
          { name: "Lunch Direct Assignment", startTime: "13:00", endTime: "14:00" }
        ]
      },
      {
        day: "Tuesday",
        isOpen: true,
        startTime: "09:00",
        endTime: "17:00",
        breakTimes: []
      }
    ];

    await settings.save();
    console.log("Settings saved.");

    // Retrieve again to verify
    const updatedSettings = await SlotSettings.findOne({ adminId: "6a5e194d152ba1720e057a94" });
    console.log("After save - Monday breaks:", JSON.stringify(updatedSettings.workingDays[0].breakTimes));

    // Clean it back up
    updatedSettings.workingDays = [
      { day: "Monday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Tuesday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] }
    ];
    await updatedSettings.save();
    console.log("Cleaned up settings.");

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

run();

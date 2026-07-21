const mongoose = require('mongoose');
const SlotSettings = require('./src/Models/SlotSettings');
const connectDB = require('./src/Database/Connection');

const run = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB. Polling every 2 seconds for 30 seconds...");

    let count = 0;
    const interval = setInterval(async () => {
      const settings = await SlotSettings.findOne({ adminId: "6a5e194d152ba1720e057a94" });
      if (settings) {
        console.log(`[${new Date().toLocaleTimeString()}] Monday Breaks:`, JSON.stringify(settings.workingDays[0].breakTimes));
      } else {
        console.log("Settings not found.");
      }
      count++;
      if (count >= 15) {
        clearInterval(interval);
        mongoose.disconnect();
        console.log("Polling complete.");
      }
    }, 2000);
  } catch (error) {
    console.error("Error:", error);
  }
};

run();

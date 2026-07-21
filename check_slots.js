const mongoose = require('mongoose');
const SlotSettings = require('./src/Models/SlotSettings');
const connectDB = require('./src/Database/Connection');

const check = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB database.");

    const allSettings = await SlotSettings.find({});
    console.log("Slot Settings in DB:");
    allSettings.forEach(s => {
      console.log(`- AdminId: ${s.adminId}`);
      console.log(`  Duration: ${s.slotDurationMinutes}, Capacity: ${s.capacityPerSlot}`);
      console.log(`  Working Days:`);
      s.workingDays.forEach(d => {
        console.log(`    * Day: ${d.day}, isOpen: ${d.isOpen}, startTime: ${d.startTime}, endTime: ${d.endTime}`);
        console.log(`      Breaks:`, JSON.stringify(d.breakTimes));
      });
      console.log(`  Root Breaks:`, JSON.stringify(s.breakTimes));
      console.log("-----------------------------------------");
    });

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

check();

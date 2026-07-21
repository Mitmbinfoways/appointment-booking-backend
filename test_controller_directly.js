const mongoose = require('mongoose');
const { updateAdminSlotSettingsSuper } = require('./src/Controllers/user.controller');
const SlotSettings = require('./src/Models/SlotSettings');
const connectDB = require('./src/Database/Connection');

const run = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    // Retrieve original settings
    const settingsBefore = await SlotSettings.findOne({ adminId: "6a5e194d152ba1720e057a94" });
    console.log("Before: Monday breaks:", JSON.stringify(settingsBefore.workingDays[0].breakTimes));

    // Construct mock request and response objects
    const req = {
      params: { adminId: "6a5e194d152ba1720e057a94" },
      body: {
        slotDurationMinutes: 30,
        capacityPerSlot: 1,
        workingDays: [
          {
            day: "Monday",
            isOpen: true,
            startTime: "09:00",
            endTime: "17:00",
            breakTimes: [
              { name: "Lunch From Mock Controller Call", startTime: "13:00", endTime: "14:00" }
            ]
          },
          {
            day: "Tuesday",
            isOpen: true,
            startTime: "09:00",
            endTime: "17:00",
            breakTimes: []
          }
        ]
      }
    };

    const res = {
      status: (statusCode) => {
        console.log("res.status called with:", statusCode);
        return res;
      },
      json: (data) => {
        console.log("res.json called with data:", JSON.stringify(data));
      }
    };

    const next = (err) => {
      if (err) console.error("next called with error:", err);
    };

    // Invoke the controller function directly!
    await updateAdminSlotSettingsSuper(req, res, next);

    // Retrieve again to see if it persisted in the DB
    const settingsAfter = await SlotSettings.findOne({ adminId: "6a5e194d152ba1720e057a94" });
    console.log("After: Monday breaks:", JSON.stringify(settingsAfter.workingDays[0].breakTimes));

    // Clean it back up
    settingsAfter.workingDays[0].breakTimes = [];
    await settingsAfter.save();
    console.log("Cleaned up settings.");

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

run();

const mongoose = require('mongoose');
const SlotSettings = require('./src/Models/SlotSettings');
const connectDB = require('./src/Database/Connection');

const check = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const settings = await SlotSettings.findOne({ adminId: '6a5e194d152ba1720e057a94' });
    console.log("Settings:", JSON.stringify(settings));

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

check();

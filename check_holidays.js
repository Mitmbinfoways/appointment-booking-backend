const mongoose = require('mongoose');
const Holiday = require('./src/Models/Holiday');
const connectDB = require('./src/Database/Connection');

const check = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const allHolidays = await Holiday.find({});
    console.log(`Holidays in DB (Count: ${allHolidays.length}):`);
    allHolidays.forEach(h => {
      console.log(JSON.stringify(h));
    });

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

check();

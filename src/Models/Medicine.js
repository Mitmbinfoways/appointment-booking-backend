const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  expiryDate: {
    type: String, // Format: YYYY-MM-DD
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  }
}, { timestamps: true });

MedicineSchema.index({ adminId: 1, name: 1 });

module.exports = mongoose.model('Medicine', MedicineSchema);

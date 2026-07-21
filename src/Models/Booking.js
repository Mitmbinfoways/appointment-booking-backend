const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: String,
    required: false
  },
  slotDate: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  slotStartTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  slotEndTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  // Key-value pair containing custom responses matching FormConfig schema fields
  dynamicResponses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { timestamps: true });

// Indexing for faster slot lookup
BookingSchema.index({ adminId: 1, slotDate: 1, slotStartTime: 1 });

module.exports = mongoose.model('Booking', BookingSchema);

const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  fieldKey: {
    type: String,
    required: true // e.g., "first_name", "phone_number"
  },
  label: {
    type: String,
    required: true // e.g., "First Name", "Phone Number"
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'number', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'image', 'video']
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String // Only populated if field type is 'select', 'checkbox', or 'radio'
  }],
  order: {
    type: Number,
    required: true // Handles drag-and-drop visual hierarchy order
  }
});

const FormConfigSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fields: [FieldSchema]
}, { timestamps: true });

module.exports = mongoose.model('FormConfig', FormConfigSchema);

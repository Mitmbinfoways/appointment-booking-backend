const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema({
  fieldKey: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: [
    {
      type: String,
    },
  ],
  order: {
    type: Number,
    required: true,
  },
});

const FormConfigSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fields: [FieldSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("FormConfig", FormConfigSchema);

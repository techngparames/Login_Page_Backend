const mongoose = require("mongoose");

// Define schema for Users
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,          // Ensures email is unique
    trim: true,
    lowercase: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true           // Ensures employee ID is unique
  },
  faceDescriptor: {
    type: [Number],        // Array of numbers representing the face embedding
    required: true,
    unique: true           // Ensures no two users can have same face
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optional: index for faceDescriptor for faster uniqueness checks
UserSchema.index({ faceDescriptor: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);
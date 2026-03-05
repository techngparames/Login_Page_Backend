// backend/models/Admin.js
const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    faceDescriptor: { type: [Number], required: true },
    location: { type: Object },
    loginCount: { type: Number, default: 0 },
    lastLogin: { type: Date, default: Date.now },

    // ================= NEW FIELDS FOR EMPLOYEE PROFILE =================
    mobile: { type: String, default: "" },
    gender: { type: String, default: "" },
    address: { type: String, default: "" },
    idProof: { type: String, default: "" },
  },
  { timestamps: true } // automatically adds createdAt & updatedAt
);

module.exports = mongoose.model("Admin", AdminSchema, "admins"); // explicitly sets collection
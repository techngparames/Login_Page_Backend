const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5050;


// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
const adminRoutes = require("./routes/Admin/adminRoutes");
const faceLoginRoutes = require("./routes/faceLoginRoutes"); 
const faceValidatorRoutes = require("./routes/Admin/faceValidatorRoutes");
const sendInviteRoute = require("./routes/sendInvite");
const trackerRoutes = require("./routes/trackerRoutes");

app.use("/api/admin", adminRoutes);
app.use("/api", faceLoginRoutes);
app.use("/api/admin", faceValidatorRoutes);
app.use("/api/admin", require("./routes/Admin/faceValidatorLoginRoutes"));
app.use("/api/admin", sendInviteRoute);
app.use("/api", trackerRoutes);


// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
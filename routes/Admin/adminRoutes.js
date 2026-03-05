// backend/routes/Admin/adminRoutes.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const Admin = require("../../models/Admin");

// ================= CONSTANTS =================
const TECHNG_LOCATION = { lat: 13.0115, lng: 80.2368 };
const FACE_THRESHOLD = 0.5; // Euclidean distance threshold
const MAX_DISTANCE_METERS = 300;

// ================= HELPERS =================
function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) sum += (arr1[i] - arr2[i]) ** 2;
  return Math.sqrt(sum);
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ================= SEND INVITE EMAIL =================
router.post("/send-invite", async (req, res) => {
  try {
    const { name, email, empId } = req.body;
    if (!name || !email || !empId)
      return res.status(400).json({ message: "Missing required fields ❌" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "techngparames@gmail.com", // Replace with your email
        pass: "hftvxwsjoojnkisw",        // App Password
      },
    });

    const faceLoginLink = `http://localhost:3000/face-login?name=${encodeURIComponent(
      name
    )}&email=${encodeURIComponent(email)}&empId=${encodeURIComponent(empId)}`;

    const mailOptions = {
      from: "techngparames@gmail.com",
      to: email,
      subject: "Setup Your Face Login",
      html: `<h2>Hello ${name},</h2>
             <p>Your Employee ID: <strong>${empId}</strong></p>
             <p>Email: <strong>${email}</strong></p>
             <p>Get ready to set up your Face Login:</p>
             <a href="${faceLoginLink}" style="
               display:inline-block;
               padding:12px 25px;
               background-color:#1abc9c;
               color:white;
               text-decoration:none;
               border-radius:8px;
               font-weight:bold;">Setup Face Login</a>
             <p>Welcome aboard! 🌟</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invite email sent to ${email}`);
    return res.status(200).json({ message: "Invite sent successfully ✅" });
  } catch (error) {
    console.error("Send Invite Error:", error);
    return res.status(500).json({ message: "Failed to send invite ❌" });
  }
});

// ================= CHECK EMAIL =================
router.get("/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email)
      return res.status(400).json({ success: false, message: "Email missing ❌" });

    const existing = await Admin.findOne({ email });
    if (existing)
      return res.json({ success: false, message: "Email already exists ❌" });

    return res.json({ success: true, message: "Email available ✅" });
  } catch (error) {
    console.error("Check Email Error:", error);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

// ================= ADD ADMIN / REGISTER =================
router.post("/add-user", async (req, res) => {
  try {
    let { employeeId, name, email, faceDescriptor, location } = req.body;

    // ================= VALIDATION =================
    if (!name || !email || !faceDescriptor)
      return res.status(400).json({ success: false, message: "Missing required fields ❌" });

    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128)
      return res.status(400).json({ success: false, message: "Invalid face descriptor ❌" });

    if (!location || !location.lat || !location.lng)
      location = { ...TECHNG_LOCATION };

    const existingAdmin = await Admin.findOne({ $or: [{ email }, { employeeId }] });
    if (existingAdmin)
      return res.status(400).json({ success: false, message: "Email or Employee ID already exists ❌" });

    // ================= FACE UNIQUENESS CHECK =================
    const allAdmins = await Admin.find();
    for (let admin of allAdmins) {
      const distance = euclideanDistance(faceDescriptor, admin.faceDescriptor);
      if (distance < FACE_THRESHOLD)
        return res.status(400).json({ success: false, message: "Face already registered ❌" });
    }

    // ================= LOCATION CHECK =================
    const distance = getDistanceMeters(location.lat, location.lng, TECHNG_LOCATION.lat, TECHNG_LOCATION.lng);
    if (distance > MAX_DISTANCE_METERS)
      return res.status(400).json({ success: false, message: `Too far from TechNG (${Math.round(distance)} m)` });

    // ================= AUTO-GENERATE EMPLOYEE ID =================
    if (!employeeId) {
      let exists = true;
      while (exists) {
        employeeId = "EMP" + Math.floor(1000 + Math.random() * 9000);
        exists = await Admin.findOne({ employeeId });
      }
    }

    // ================= SAVE ADMIN =================
    const newAdmin = new Admin({
      employeeId,
      name,
      email,
      faceDescriptor: Array.from(faceDescriptor),
      location,
      loginCount: 1,
      lastLogin: new Date(),
    });

    await newAdmin.save();

    return res.status(201).json({
      success: true,
      user: newAdmin,
      message: "Admin registered ✅",
      locationDistance: Math.round(distance),
    });
  } catch (error) {
    console.error("Add Admin Error:", error);
    return res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

// ================= FACE LOGIN =================
router.post("/face-login", async (req, res) => {
  try {
    const { faceDescriptor, location } = req.body;

    if (!faceDescriptor || !location || faceDescriptor.length !== 128)
      return res.status(400).json({ success: false, message: "Invalid face or location ❌" });

    const distance = getDistanceMeters(location.lat, location.lng, TECHNG_LOCATION.lat, TECHNG_LOCATION.lng);
    if (distance > MAX_DISTANCE_METERS)
      return res.status(400).json({ success: false, message: `Too far from TechNG (${Math.round(distance)} m)` });

    const allAdmins = await Admin.find();
    for (let admin of allAdmins) {
      const dist = euclideanDistance(faceDescriptor, admin.faceDescriptor);
      if (dist < FACE_THRESHOLD) {
        admin.lastLogin = new Date();
        admin.loginCount = (admin.loginCount || 0) + 1;
        await admin.save();

        return res.json({
          success: true,
          user: admin,
          message: "Login successful ✅",
          locationDistance: Math.round(distance),
        });
      }
    }

    return res.json({ success: false, newUser: true, message: "Face not recognized ❌" });
  } catch (error) {
    console.error("Face Login Error:", error);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

// ================= EMPLOYEE DATA =================
router.get("/employees", async (req, res) => {
  try {
    const employees = await Admin.find();
    res.json({ success: true, employees });
  } catch (err) {
    console.error("Fetch Employees Error:", err);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

router.get("/employee-count", async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    res.json({ success: true, totalEmployees: count });
  } catch (error) {
    console.error("Fetch Employee Count Error:", error);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

router.get("/onboarded-count", async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error("Onboarded Count Error:", error);
    res.status(500).json({ success: false, count: 0 });
  }
});

// ================= DELETE / EDIT =================
router.delete("/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Employee not found ❌" });
    res.json({ success: true, message: "Employee removed ✅" });
  } catch (error) {
    console.error("Delete Employee Error:", error);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

router.put("/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email)
      return res.status(400).json({ success: false, message: "Nothing to update ❌" });

    if (email) {
      const existing = await Admin.findOne({ email, _id: { $ne: id } });
      if (existing) return res.status(400).json({ success: false, message: "Email already exists ❌" });
    }

    const updated = await Admin.findByIdAndUpdate(id, { $set: { name, email } }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Employee not found ❌" });

    res.json({ success: true, message: "Employee updated ✅", employee: updated });
  } catch (error) {
    console.error("Edit Employee Error:", error);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

// ================= EMPLOYEE ACTIVITY =================
router.get("/employee-activity", async (req, res) => {
  try {
    const employees = await Admin.find();

    const activityData = employees.map(emp => {
      const loginTime = emp.lastLogin || null;
      const logoutTime = emp.lastLogout || null;
      let totalHours = null;

      if (loginTime && logoutTime) {
        const diffMs = new Date(logoutTime) - new Date(loginTime);
        totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
      }

      return {
        name: emp.name,
        date: loginTime ? new Date(loginTime).toLocaleDateString() : "-",
        loginTime: loginTime ? new Date(loginTime).toLocaleTimeString() : "-",
        logoutTime: logoutTime ? new Date(logoutTime).toLocaleTimeString() : "-",
        totalHours: totalHours || "-",
      };
    });

    res.json({ success: true, activity: activityData });
  } catch (error) {
    console.error("Employee Activity Error:", error);
    res.status(500).json({ success: false, activity: [] });
  }
});

// ================= CHECK FACE UNIQUENESS =================
router.post("/check-face", async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || faceDescriptor.length !== 128)
      return res.status(400).json({ unique: false, message: "Invalid face descriptor ❌" });

    const allAdmins = await Admin.find();
    for (let admin of allAdmins) {
      const distance = euclideanDistance(faceDescriptor, admin.faceDescriptor);
      if (distance < FACE_THRESHOLD) return res.json({ unique: false });
    }

    return res.json({ unique: true });
  } catch (error) {
    console.error("Check Face Error:", error);
    res.status(500).json({ unique: false });
  }
});

module.exports = router;
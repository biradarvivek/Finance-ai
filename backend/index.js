const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authMiddleware = require("./middlewares/authMiddleware");
const connectDB = require("./config/db");
const uploadRoutes = require("./routes/uploadRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", uploadRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("Hello from backend!");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

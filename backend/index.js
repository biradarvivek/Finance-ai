const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const uploadRoutes = require("./routes/uploadRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", uploadRoutes);
app.use("/api/analysis", analysisRoutes);

app.get("/", (req, res) => {
  res.send("Hello from backend!");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

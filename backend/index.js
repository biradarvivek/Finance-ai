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
// -----------------------------
// AI CHAT PROXY ROUTE
// -----------------------------
app.get("/api/chat", async (req, res) => {
  try {
    const userQuery = req.query.query;
    console.log(`💬 [NODE.JS] Intercepted chat request: "${userQuery}"`);

    // Forward the exact question to the Python FastAPI server
    const pythonResponse = await fetch(
      `http://localhost:8000/chat?query=${encodeURIComponent(userQuery)}`,
    );

    // Wait for the AI's answer
    const data = await pythonResponse.json();

    // Send the AI's answer back to the React frontend
    res.json(data);
  } catch (error) {
    console.error("❌ [NODE.JS] Chat proxy error:", error.message);
    res
      .status(500)
      .json({
        answer:
          "My Node.js bridge is having trouble connecting to the Python AI engine.",
      });
  }
});

app.get("/", (req, res) => {
  res.send("Hello from backend!");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

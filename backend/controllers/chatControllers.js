const Chat = require("../models/Chat");

// 1. Fetch History on Page Load
exports.getChatHistory = async (req, res) => {
  try {
    const history = await Chat.find({ userId: req.userId }).sort({
      createdAt: 1,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

// 2. Ask AI & Save Messages
exports.askQuestion = async (req, res) => {
  try {
    const userQuery = req.query.query;

    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : "";

    const pastMessages = await Chat.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(4);

    const historyString = pastMessages
      .reverse()
      .map((m) => `${m.role === "ai" ? "AI" : "User"}: ${m.text}`)
      .join("\n");

    // A. Save the USER'S question to MongoDB
    await Chat.create({ userId: req.userId, role: "user", text: userQuery });

    // B. Forward to Python FastAPI
    // Note: We use dynamic import for fetch in older Node versions, but native fetch works in Node 18+
    const pythonResponse = await fetch(
      `http://localhost:8000/chat?query=${encodeURIComponent(userQuery)}&user_id=${req.userId}&history=${encodeURIComponent(historyString)}&token=${token}`,
    );
    const data = await pythonResponse.json();

    // C. Save the AI'S answer to MongoDB
    await Chat.create({ userId: req.userId, role: "ai", text: data.answer });

    // D. Send answer back to React
    res.json(data);
  } catch (error) {
    console.error("Chat Error:", error);
    res
      .status(500)
      .json({ answer: "My connection to the AI engine was interrupted." });
  }
};

const Transaction = require("../models/Transaction");

exports.compareMonths = async (req, res) => {
  console.log("\n📊 --- STARTING MONTHLY ANALYSIS ---");

  try {
    let { current, previous } = req.query;

    if (!current || !previous) {
      return res.status(400).json({
        error: "Please provide 'current' and 'previous' months in the query.",
      });
    }

    current = current.trim();
    previous = previous.trim();

    console.log(
      `🔍 Comparing: '${current}' vs '${previous}' for User: ${req.userId}`,
    );

    // 🔥 HIGH PERFORMANCE: MongoDB Aggregation Pipeline
    const expenses = await Transaction.aggregate([
      {
        $match: {
          userId: req.userId, // 👈 1. SECURITY LOCK: Only aggregate THIS user's data!
          month: { $in: [current, previous] },
        },
      },
      {
        $group: {
          _id: { month: "$month", category: "$category" },
          totalSpent: { $sum: "$amount" }, // Sums both positives and negatives
        },
      },
    ]);

    // 🚀 Print exactly what MongoDB found!
    console.log("Raw Expenses from DB:", expenses);

    // 🏗️ Transform the raw MongoDB data into a clean, structured object
    const summary = { [current]: {}, [previous]: {} };

    expenses.forEach((item) => {
      const month = item._id.month;
      const category = item._id.category;
      summary[month][category] = Math.abs(item.totalSpent);
    });

    // ⚖️ Calculate the Differences (Current Month - Previous Month)
    const comparison = {};
    const allCategories = new Set([
      ...Object.keys(summary[current]),
      ...Object.keys(summary[previous]),
    ]);

    allCategories.forEach((category) => {
      const currSpent = summary[current][category] || 0;
      const prevSpent = summary[previous][category] || 0;
      comparison[category] = currSpent - prevSpent;
    });

    console.log("✅ Analysis complete!");
    console.log("-----------------------------------\n");

    res.json({
      months: { current, previous },
      summary: summary,
      comparison: comparison,
    });
  } catch (err) {
    console.error("❌ Analysis Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🚀 NEW: Fetch all unique months that exist in the database
exports.getAvailableMonths = async (req, res) => {
  try {
    // 👈 2. SECURITY LOCK: Only fetch the distinct months for THIS user!
    const months = await Transaction.distinct("month", { userId: req.userId });
    console.log(`📅 Available months for User ${req.userId}:`, months);

    // Sort them alphabetically
    months.sort();

    res.json(months);
  } catch (err) {
    console.error("❌ Error fetching months:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🚀 NEW: Check if the user has data on page refresh
exports.getDashboardStatus = async (req, res) => {
  try {
    const count = await Transaction.countDocuments({ userId: req.userId });
    res.json({ hasData: count > 0, totalTransactions: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🚀 NEW: Dynamic Agentic Querying (Text-to-Mongo)
exports.calculateDynamicTotal = async (req, res) => {
  try {
    const { category, year, keyword } = req.query;
    console.log(
      `Received Agentic Query with filters - Category: ${category}, Year: ${year}, Keyword: ${keyword} for User: ${req.userId}`,
    );

    // 1. Base Security Match (Crucial for Multi-tenant)
    const matchStage = { userId: req.userId };

    // 2. Dynamically build the query based on Python's extracted parameters
    if (category) {
      // Case-insensitive regex search for category
      matchStage.category = { $regex: new RegExp(category, "i") };
    }
    if (year) {
      // Searches the 'month' string for the year (e.g., "2023")
      matchStage.month = { $regex: new RegExp(year, "i") };
    }
    if (keyword) {
      // Search the description for specific brands/keywords (e.g., "Swiggy", "Amazon")
      matchStage.description = { $regex: new RegExp(keyword, "i") };
    }

    console.log(`🤖 AI Agent calculating total with filters:`, {
      category,
      year,
      keyword,
    });

    // 3. High-Performance Aggregation
    const result = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }, // Adds up all the matching transactions
          transactionCount: { $sum: 1 }, // Counts how many transactions matched
        },
      },
    ]);

    // 4. Format and return safely
    const total = result.length > 0 ? result[0].totalAmount : 0;
    const count = result.length > 0 ? result[0].transactionCount : 0;

    res.json({
      success: true,
      totalAmount: Math.abs(total), // Return absolute value for easier LLM reading
      type: total < 0 ? "Expense" : total > 0 ? "Income" : "None",
      transactionCount: count,
    });
  } catch (err) {
    console.error("❌ Agentic Query Error:", err);
    res.status(500).json({ error: err.message });
  }
};

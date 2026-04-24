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

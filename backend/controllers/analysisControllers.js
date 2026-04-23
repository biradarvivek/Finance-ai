const Transaction = require("../models/Transaction");

exports.compareMonths = async (req, res) => {
  console.log("\n📊 --- STARTING MONTHLY ANALYSIS ---");

  try {
    // 1. Extract AND trim immediately to prevent key-mismatch crashes later
    let { current, previous } = req.query;

    if (!current || !previous) {
      return res.status(400).json({
        error: "Please provide 'current' and 'previous' months in the query.",
      });
    }

    current = current.trim();
    previous = previous.trim();

    console.log(`🔍 Comparing: '${current}' vs '${previous}'`);

    // 🔥 HIGH PERFORMANCE: MongoDB Aggregation Pipeline
    const expenses = await Transaction.aggregate([
      {
        $match: {
          month: { $in: [current, previous] },
          // 🛑 REMOVED the { amount: { $lt: 0 } } filter!
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
    // Now using the perfectly clean keys!
    const summary = { [current]: {}, [previous]: {} };

    expenses.forEach((item) => {
      const month = item._id.month;
      const category = item._id.category;

      // Convert negative amounts to positive for easier reading in the UI
      // If the category doesn't exist yet, it safely creates it
      summary[month][category] = Math.abs(item.totalSpent);
    });

    // ⚖️ Calculate the Differences (Current Month - Previous Month)
    const comparison = {};

    // Get a unique list of all categories that show up in either month
    const allCategories = new Set([
      ...Object.keys(summary[current]),
      ...Object.keys(summary[previous]),
    ]);

    allCategories.forEach((category) => {
      const currSpent = summary[current][category] || 0;
      const prevSpent = summary[previous][category] || 0;

      // Positive number = spent MORE this month. Negative number = spent LESS.
      comparison[category] = currSpent - prevSpent;
    });

    console.log("✅ Analysis complete!");
    console.log("Comparison Data:", comparison);
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
    // .distinct() is a super fast MongoDB command that gets unique values
    const months = await Transaction.distinct("month");

    // Sort them alphabetically (or you can write custom date sorting later)
    months.sort();

    res.json(months);
  } catch (err) {
    console.error("❌ Error fetching months:", err);
    res.status(500).json({ error: err.message });
  }
};

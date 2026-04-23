const Transaction = require("../models/Transaction");

exports.compareMonths = async (req, res) => {
  console.log("\n📊 --- STARTING MONTHLY ANALYSIS ---");

  try {
    // We expect the frontend to tell us which months to compare (e.g., ?current=APR&previous=MAR)
    const { current, previous } = req.query;

    if (!current || !previous) {
      return res
        .status(400)
        .json({
          error: "Please provide 'current' and 'previous' months in the query.",
        });
    }

    console.log(`🔍 Comparing: ${current} vs ${previous}`);

    // 🔥 HIGH PERFORMANCE: MongoDB Aggregation Pipeline
    const expenses = await Transaction.aggregate([
      {
        $match: {
          amount: { $lt: 0 }, // Filter 1: Only look at expenses (negative amounts)
          month: { $in: [current, previous] }, // Filter 2: Only fetch the two requested months
        },
      },
      {
        $group: {
          _id: { month: "$month", category: "$category" },
          totalSpent: { $sum: "$amount" }, // Sum up the expenses
        },
      },
    ]);

    // 🏗️ Transform the raw MongoDB data into a clean, structured object
    const summary = { [current]: {}, [previous]: {} };

    expenses.forEach((item) => {
      const month = item._id.month;
      const category = item._id.category;

      // Convert negative amounts to positive for easier reading in the UI
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

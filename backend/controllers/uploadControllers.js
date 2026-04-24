const axios = require("axios");
const Transaction = require("../models/Transaction");

exports.uploadFile = async (req, res) => {
  console.log(req.file);
  try {
    // 1. 🚀 PASS THE USER ID TO PYTHON
    // This ensures ChromaDB tags these vectors for the correct user!
    const response = await axios.post(
      `http://localhost:8000/process?user_id=${req.userId}`, // 👈 UPDATED HERE
      req.file.buffer,
      {
        headers: { "Content-Type": "application/pdf" },
      },
    );

    console.log("Response from AI service:", response.data);
    const transactions = response.data.transactions;

    // 🔥 FORMAT DATA HERE
    console.log("⚙️ Formatting transaction data for MongoDB...");
    const formattedTransactions = transactions.map((txn, index) => {
      let finalAmount = 0;

      // Grab possible variations
      const rawDebit =
        txn.debit || txn.Debit || txn.DEBIT || txn.withdrawal || 0;
      const rawCredit =
        txn.credit || txn.Credit || txn.CREDIT || txn.deposit || 0;
      const rawAmount = txn.amount || txn.Amount || txn.AMOUNT || 0;
      const typeStr = String(txn.type || txn.Type || "").toUpperCase();

      // Clean the numbers
      const cleanDebit = parseFloat(String(rawDebit).replace(/,/g, "")) || 0;
      const cleanCredit = parseFloat(String(rawCredit).replace(/,/g, "")) || 0;
      const cleanAmount = parseFloat(String(rawAmount).replace(/,/g, "")) || 0;
      const safeDesc =
        txn.description || txn.Description || txn.NARATION || "No Description";

      // BULLETPROOF MATH LOGIC
      if (cleanDebit > 0) {
        finalAmount = -Math.abs(cleanDebit);
      } else if (cleanCredit > 0) {
        finalAmount = Math.abs(cleanCredit);
      } else if (cleanAmount > 0) {
        if (typeStr === "DEBIT" || typeStr === "DR") {
          finalAmount = -Math.abs(cleanAmount);
        } else if (typeStr === "CREDIT" || typeStr === "CR") {
          finalAmount = Math.abs(cleanAmount);
        } else {
          if (String(safeDesc).toUpperCase().includes("TO: ")) {
            finalAmount = -Math.abs(cleanAmount);
          } else {
            finalAmount = cleanAmount;
          }
        }
      }

      // Safely grab date and balance
      const safeDate = txn.date || txn.Date || txn.DATE || "";
      const safeBalance =
        parseFloat(String(txn.balance || txn.Balance || 0).replace(/,/g, "")) ||
        0;

      // Extract Month and Year
      const dateParts = safeDate.split("-");
      const monthYear =
        dateParts.length === 3 ? `${dateParts[1]}-${dateParts[2]}` : "Unknown";

      return {
        userId: req.userId, // 👈 2. 🚀 UPDATED HERE: Use the real, logged-in user ID!
        date: safeDate,
        description: safeDesc,
        amount: finalAmount,
        balance: safeBalance,
        category: txn.category || "Others",
        month: monthYear,
      };
    });

    console.log("Formatted transactions mapped to user:", req.userId);

    // Save to MongoDB
    await Transaction.insertMany(formattedTransactions);

    res.json({
      message: "Transactions saved successfully",
      count: formattedTransactions.length,
    });
  } catch (err) {
    console.error("Upload Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

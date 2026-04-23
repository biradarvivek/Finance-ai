const axios = require("axios");
const Transaction = require("../models/Transaction");

exports.uploadFile = async (req, res) => {
  console.log(req.file);
  try {
    const response = await axios.post(
      "http://localhost:8000/process",
      req.file.buffer,
      {
        headers: { "Content-Type": "application/pdf" },
      },
    );

    console.log("Response from AI service:", response.data);

    const transactions = response.data.transactions;
    console.log("Extracted transactions:", transactions);

    // 🔥 FORMAT DATA HERE
    console.log("⚙️ Formatting transaction data for MongoDB...");
    const formattedTransactions = transactions.map((txn, index) => {
      let finalAmount = 0;

      // 1. Grab every possible variation the LLM might have used
      const rawDebit =
        txn.debit || txn.Debit || txn.DEBIT || txn.withdrawal || 0;
      const rawCredit =
        txn.credit || txn.Credit || txn.CREDIT || txn.deposit || 0;
      const rawAmount = txn.amount || txn.Amount || txn.AMOUNT || 0;
      const typeStr = String(txn.type || txn.Type || "").toUpperCase();

      // 2. Clean the numbers (remove commas)
      const cleanDebit = parseFloat(String(rawDebit).replace(/,/g, "")) || 0;
      const cleanCredit = parseFloat(String(rawCredit).replace(/,/g, "")) || 0;
      const cleanAmount = parseFloat(String(rawAmount).replace(/,/g, "")) || 0;
      const safeDesc =
        txn.description || txn.Description || txn.NARATION || "No Description";

      // 3. BULLETPROOF MATH LOGIC
      if (cleanDebit > 0) {
        // Scenario A: It used 'debit'
        finalAmount = -Math.abs(cleanDebit);
      } else if (cleanCredit > 0) {
        // Scenario B: It used 'credit'
        finalAmount = Math.abs(cleanCredit);
      } else if (cleanAmount > 0) {
        // Scenario C: It used 'amount' and 'type'
        if (typeStr === "DEBIT" || typeStr === "DR") {
          finalAmount = -Math.abs(cleanAmount);
        } else if (typeStr === "CREDIT" || typeStr === "CR") {
          finalAmount = Math.abs(cleanAmount);
        } else {
          // Scenario D: It ONLY gave us an 'amount'.
          // We can guess it's a debit if the description says "TO:"
          if (String(safeDesc).toUpperCase().includes("TO: ")) {
            finalAmount = -Math.abs(cleanAmount);
          } else {
            finalAmount = cleanAmount; // Fallback
          }
        }
      }

      // 4. Safely grab date and balance
      const safeDate = txn.date || txn.Date || txn.DATE || "";
      const safeBalance =
        parseFloat(String(txn.balance || txn.Balance || 0).replace(/,/g, "")) ||
        0;

      // 5. Extract Month and Year (e.g., "MAR-2023")
      const dateParts = safeDate.split("-");
      const monthYear =
        dateParts.length === 3 ? `${dateParts[1]}-${dateParts[2]}` : "Unknown";

      return {
        userId: "user1",
        date: safeDate,
        description: safeDesc,
        amount: finalAmount,
        balance: safeBalance,
        category: txn.category || "Others", // 👈 FIX: Grab the category directly from txn!
        month: monthYear,
      };
    });

    console.log("Formatted transactions:", formattedTransactions);

    // Save to MongoDB
    await Transaction.insertMany(formattedTransactions);

    res.json({
      message: "Transactions saved successfully",
      count: formattedTransactions.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

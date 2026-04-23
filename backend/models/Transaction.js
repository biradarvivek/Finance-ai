const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: String,
  date: String,
  description: String,
  amount: Number, // ✅ ONLY ONE FIELD
  balance: Number,
  category: String,
  month: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);

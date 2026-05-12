const ExcelJS = require("exceljs");
const Transaction = require("../models/Transaction");

exports.exportToExcel = async (req, res) => {
  try {
    // 1. Fetch all transactions for this specific user
    const transactions = await Transaction.find({ userId: req.userId }).sort({
      date: -1,
    });

    console.log(
      `Fetched ${transactions.length} transactions for user ID: ${req.userId}`,
    ); // 🚀 Debug: See how many transactions were fetched

    if (!transactions || transactions.length === 0) {
      return res
        .status(404)
        .json({ error: "No transactions found in the vault." });
    }

    // 2. Create the Workbook and Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transactions");

    // 3. Define the basic columns
    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Description", key: "description", width: 50 },
      { header: "Category", key: "category", width: 25 },
      { header: "Amount", key: "amount", width: 15 },
    ];

    // Make the header row bold for readability
    worksheet.getRow(1).font = { bold: true };

    // 4. Add the data
    transactions.forEach((txn) => {
      worksheet.addRow({
        date: txn.date,
        description: txn.description,
        category: txn.category,
        amount: txn.amount,
      });
    });

    // 5. Send it to the browser as a downloadable file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=FinAI_Statement.xlsx",
    );

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error("Excel Generation Error:", error);
    res.status(500).json({ error: "Failed to generate Excel file." });
  }
};

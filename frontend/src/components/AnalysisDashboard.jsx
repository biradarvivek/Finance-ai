import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export default function AnalysisDashboard({
  availableMonths,
  selectedCurrent,
  setSelectedCurrent,
  selectedPrevious,
  setSelectedPrevious,
  isAnalyzing,
  fetchAnalysis,
  deepAnalysis,
}) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-8 animate-fade-in mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            3. Visual Analytics
          </h2>
          <p className="text-sm text-gray-500">
            Compare your month-over-month spending trends.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
          <div className="flex flex-col gap-1 flex-1 md:w-40">
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Current
            </label>
            <select
              value={selectedCurrent}
              onChange={(e) => setSelectedCurrent(e.target.value)}
              className="border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 bg-white text-sm"
            >
              <option value="">Select...</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 md:w-40">
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Previous
            </label>
            <select
              value={selectedPrevious}
              onChange={(e) => setSelectedPrevious(e.target.value)}
              className="border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 bg-white text-sm"
            >
              <option value="">Select...</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={!selectedCurrent || !selectedPrevious || isAnalyzing}
            className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors h-[42px] text-sm"
          >
            {isAnalyzing ? "..." : "Compare"}
          </button>
        </div>
      </div>

      {/* The Charts */}
      {deepAnalysis && deepAnalysis.summary && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
            {/* Pie Chart */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 text-center">
                {deepAnalysis.months.current} Breakdown
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.keys(
                      deepAnalysis.summary[deepAnalysis.months.current] || {},
                    )
                      .map((category) => ({
                        name: category,
                        value:
                          deepAnalysis.summary[deepAnalysis.months.current][
                            category
                          ],
                      }))
                      .filter((item) => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.keys(
                      deepAnalysis.summary[deepAnalysis.months.current] || {},
                    ).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 text-center">
                Trend Comparison
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.keys(deepAnalysis.comparison).map(
                    (category) => ({
                      name: category,
                      [deepAnalysis.months.current]:
                        deepAnalysis.summary[deepAnalysis.months.current]?.[
                          category
                        ] || 0,
                      [deepAnalysis.months.previous]:
                        deepAnalysis.summary[deepAnalysis.months.previous]?.[
                          category
                        ] || 0,
                    }),
                  )}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    width={80}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    formatter={(value) => `₹${value.toLocaleString()}`}
                    cursor={{ fill: "rgba(243, 244, 246, 0.5)" }}
                  />
                  <Legend />
                  <Bar
                    dataKey={deepAnalysis.months.current}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={deepAnalysis.months.previous}
                    fill="#9ca3af"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="mt-4">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">
              Detailed Ledger
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold text-right">
                      {deepAnalysis.months.previous}
                    </th>
                    <th className="p-3 font-semibold text-right">
                      {deepAnalysis.months.current}
                    </th>
                    <th className="p-3 font-semibold text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(deepAnalysis.comparison).map((category, idx) => {
                    const curr =
                      deepAnalysis.summary[deepAnalysis.months.current]?.[
                        category
                      ] || 0;
                    const prev =
                      deepAnalysis.summary[deepAnalysis.months.previous]?.[
                        category
                      ] || 0;
                    const diff = deepAnalysis.comparison[category];
                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <td className="p-3 font-medium text-gray-700">
                          {category}
                        </td>
                        <td className="p-3 text-right text-gray-500">
                          ₹{prev.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-800">
                          ₹{curr.toLocaleString()}
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-gray-400"}`}
                        >
                          {diff > 0 ? "↑" : diff < 0 ? "↓" : "="} ₹
                          {Math.abs(diff).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

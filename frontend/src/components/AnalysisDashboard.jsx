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
  "#22d3ee",
  "#fb7185",
  "#a78bfa",
  "#34d399",
  "#fcd34d",
  "#60a5fa",
  "#f472b6",
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
    <div className="bg-slate-800/50 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-8 animate-fade-in">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Visual Analytics
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Compare your month-over-month spending trends.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
          <div className="flex flex-col gap-2 flex-1 md:w-40">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Primary Point
            </label>
            <select
              value={selectedCurrent}
              onChange={(e) => setSelectedCurrent(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:border-cyan-500 text-white text-sm"
            >
              <option value="">Select Target...</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 flex-1 md:w-40">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Reference Point
            </label>
            <select
              value={selectedPrevious}
              onChange={(e) => setSelectedPrevious(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:border-cyan-500 text-white text-sm"
            >
              <option value="">Select Anchor...</option>
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
            className="bg-white hover:bg-slate-200 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold px-8 py-3 rounded-xl transition-all h-[46px] text-sm"
          >
            {isAnalyzing ? "Scanning..." : "Compute"}
          </button>
        </div>
      </div>

      {/* The Charts Grid */}
      {deepAnalysis && deepAnalysis.summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart Card */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col relative overflow-hidden h-[420px]">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 z-10">
              {deepAnalysis.months.current} Allocation
            </h3>

            {/* 🔥 FIX: Hardcoded height wrapper to prevent SVG collapse */}
            <div className="h-[320px] w-full z-10 mt-4">
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
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
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
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart Card */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col relative overflow-hidden h-[420px]">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 z-10">
              Trend Comparison
            </h3>

            {/* 🔥 FIX: Hardcoded height wrapper to prevent SVG collapse */}
            <div className="h-[320px] w-full z-10 mt-4">
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
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#334155"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(30, 41, 59, 0.5)" }}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      paddingTop: "20px",
                    }}
                  />
                  <Bar
                    dataKey={deepAnalysis.months.current}
                    fill="#22d3ee"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={deepAnalysis.months.previous}
                    fill="#475569"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ledger Table spans both columns below charts */}
          <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 mt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              Detailed Ledger
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold text-right">
                      {deepAnalysis.months.previous} Anchor
                    </th>
                    <th className="p-4 font-bold text-right">
                      {deepAnalysis.months.current} Target
                    </th>
                    <th className="p-4 font-bold text-right">Trend</th>
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
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-sm"
                      >
                        <td className="p-4 font-bold text-white">{category}</td>
                        <td className="p-4 text-right text-slate-400 font-mono">
                          ₹{prev.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-200 font-mono">
                          ₹{curr.toLocaleString()}
                        </td>
                        <td
                          className={`p-4 text-right font-bold font-mono ${diff > 0 ? "text-rose-400" : diff < 0 ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {diff > 0 ? "▲" : diff < 0 ? "▼" : "■"} ₹
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

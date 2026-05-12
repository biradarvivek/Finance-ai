import React from "react";

export default function UploadCard({
  file,
  setFile,
  uploadFile,
  isUploading,
  insights,
  handleExportExcel,
}) {
  return (
    <>
      <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl transition-all hover:border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              ></path>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Add Your Statement</h2>
        </div>

        <form onSubmit={uploadFile} className="flex flex-col gap-4">
          <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 hover:border-cyan-400 hover:bg-cyan-400/5 rounded-2xl cursor-pointer transition-all overflow-hidden">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="text-sm text-slate-400 font-medium">
                {file ? (
                  <span className="text-cyan-400">{file.name}</span>
                ) : (
                  "Drop secure PDF here"
                )}
              </p>
            </div>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>

          <button
            type="submit"
            disabled={isUploading || !file}
            className="bg-slate-900 hover:bg-slate-950 disabled:bg-slate-800 border border-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg w-full disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {isUploading ? "Analyzing..." : "Analyze My Expenses"}
          </button>
        </form>
      </div>

      {insights && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-cyan-500/20 shadow-xl shadow-cyan-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full"></div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Core Telemetry
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-sm font-medium text-slate-400">
                Database State
              </span>
              <span className="text-cyan-400 font-mono text-xs bg-cyan-400/10 px-2 py-1 rounded-md">
                {insights.message}
              </span>
            </div>
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-medium text-slate-400">
                We found and organized your transactions
              </span>
              <span className="font-bold text-3xl text-white tracking-tighter">
                {insights.totalTransactions}
              </span>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full mt-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group"
          >
            <svg
              className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
            Download Excel Matrix
          </button>
        </div>
      )}
    </>
  );
}

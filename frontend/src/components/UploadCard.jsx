import React from "react";

export default function UploadCard({
  file,
  setFile,
  uploadFile,
  isUploading,
  insights,
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-5">
          1. Upload Statement
        </h2>
        <form onSubmit={uploadFile} className="flex flex-col gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-gray-500 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:bg-blue-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
          />
          <button
            type="submit"
            disabled={isUploading || !file}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm w-full"
          >
            {isUploading ? "Processing Document..." : "Upload & Analyze"}
          </button>
        </form>
      </div>

      {/* Quick Insights Section */}
      {insights && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-5">
            2. Quick Insights
          </h2>
          <div className="flex justify-between items-center mb-4 text-gray-700">
            <span className="font-medium text-gray-500">Status:</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-sm">
              {insights.message}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span className="font-medium text-gray-500">
              Transactions Parsed:
            </span>
            <span className="font-bold text-2xl text-gray-800">
              {insights.totalTransactions}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

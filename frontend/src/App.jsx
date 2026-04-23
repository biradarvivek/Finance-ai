import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedCurrent, setSelectedCurrent] = useState("");
  const [selectedPrevious, setSelectedPrevious] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! Upload your bank statement, and ask me anything about your spending.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // 📁 Handle PDF Upload (Updated to use Axios & Port 8000)
  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a PDF first!");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Hitting your Python FastAPI server directly
      const res = await axios.post(
        "http://localhost:5000/api/upload",
        formData,
      );
      console.log("Upload response:", res);

      setInsights({
        totalTransactions: res.data.count || 0,
        message: "PDF processed and saved to AI Database successfully!",
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to process the PDF. Is your Python server running?");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAvailableMonths = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/analysis/months");
      setAvailableMonths(res.data);
    } catch (err) {
      console.error("Failed to fetch available months:", err);
    }
  };

  useEffect(() => {
    fetchAvailableMonths();
  }, [insights]);

  // 📊 Handle Fetching the Comparison Data
  const fetchAnalysis = async () => {
    if (!selectedCurrent || !selectedPrevious) return;

    setIsAnalyzing(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/analysis/compare?current=${selectedCurrent}&previous=${selectedPrevious}`,
      );
      setDeepAnalysis(res.data);
    } catch (error) {
      console.error("Analysis fetch failed:", error);
      alert("No data found for these months, or the server failed.");
      setDeepAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 💬 Handle AI Chat
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    // 💬 Handle AI Chat
    try {
      // 🛑 CHANGED: Pointing to Node.js (5000) instead of Python directly!
      const res = await axios.get(`http://localhost:5000/api/chat`, {
        params: { query: userMsg },
      });
      console.log("Chat response:", res);

      setMessages((prev) => [...prev, { role: "ai", text: res.data.answer }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to the AI brain." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-[90vh]">
        {/* LEFT PANEL: Upload & Insights */}
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Financial AI Agent
          </h1>

          {/* Upload Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-600 border-b pb-3 mb-5">
              1. Upload Statement
            </h2>
            <form onSubmit={uploadFile} className="flex flex-col gap-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-gray-500 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                type="submit"
                disabled={isUploading || !file}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors w-full"
              >
                {isUploading ? "Processing..." : "Upload & Analyze"}
              </button>
            </form>
          </div>

          {insights && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 animate-fade-in">
              <h2 className="text-lg font-semibold text-gray-600 border-b pb-3">
                3. Monthly Breakdown
              </h2>

              {/* --- NEW: Dropdown Controls --- */}
              <div className="flex gap-4 items-end">
                <div className="flex flex-col flex-1 gap-2">
                  <label className="text-sm text-gray-500 font-semibold">
                    Current Month
                  </label>
                  <select
                    value={selectedCurrent}
                    onChange={(e) => setSelectedCurrent(e.target.value)}
                    className="border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                  >
                    <option value="">Select Month...</option>
                    {/* 🚀 NOW DYNAMIC! */}
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col flex-1 gap-2">
                  <label className="text-sm text-gray-500 font-semibold">
                    Previous Month
                  </label>
                  <select
                    value={selectedPrevious}
                    onChange={(e) => setSelectedPrevious(e.target.value)}
                    className="border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                  >
                    <option value="">Select Month...</option>
                    {/* 🚀 NOW DYNAMIC! */}
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={fetchAnalysis}
                  disabled={
                    !selectedCurrent || !selectedPrevious || isAnalyzing
                  }
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-xl transition-colors h-[50px]"
                >
                  {isAnalyzing ? "Loading..." : "Compare"}
                </button>
              </div>

              {/* --- The Results Table (Only shows after 'Compare' is clicked) --- */}
              {deepAnalysis && deepAnalysis.summary && (
                <div className="mt-4 flex flex-col gap-3">
                  {Object.keys(deepAnalysis.comparison).map((category, idx) => {
                    const currSpent =
                      deepAnalysis.summary[deepAnalysis.months.current]?.[
                        category
                      ] || 0;
                    const prevSpent =
                      deepAnalysis.summary[deepAnalysis.months.previous]?.[
                        category
                      ] || 0;
                    const diff = deepAnalysis.comparison[category];

                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-bold text-gray-700 w-1/4 truncate">
                          {category}
                        </span>

                        <div className="flex gap-4 text-sm w-3/4 justify-end">
                          <div className="flex flex-col text-right w-1/3">
                            <span className="text-gray-400 text-xs uppercase tracking-wider">
                              {deepAnalysis.months.previous}
                            </span>
                            <span className="font-semibold text-gray-500">
                              ₹{prevSpent.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col text-right border-l pl-4 border-gray-200 w-1/3">
                            <span className="text-gray-400 text-xs uppercase tracking-wider">
                              {deepAnalysis.months.current}
                            </span>
                            <span className="font-semibold text-gray-800">
                              ₹{currSpent.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col text-right border-l pl-4 border-gray-200 w-1/3">
                            <span className="text-gray-400 text-xs uppercase tracking-wider">
                              Trend
                            </span>
                            <span
                              className={`font-bold ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-gray-400"}`}
                            >
                              {diff > 0 ? "↑" : diff < 0 ? "↓" : "="} ₹
                              {Math.abs(diff).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Insights Card */}
          {insights && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-600 border-b pb-3 mb-5">
                2. Quick Insights
              </h2>
              <div className="flex justify-between items-center mb-3 text-gray-700">
                <span className="font-medium">Status:</span>
                <span className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full text-sm">
                  {insights.message}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-medium">Transactions Found:</span>
                <span className="font-bold text-xl">
                  {insights.totalTransactions}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Deep Analysis Card - NOW INTERACTIVE */}

        {/* RIGHT PANEL: Chatbot */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-full">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  {/* Notice how the className is now on a wrapping <div> instead of the Markdown tag */}
                  {msg.role === "user" ? (
                    msg.text
                  ) : (
                    <div className="prose prose-sm max-w-none prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-gray-300 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="max-w-[75%] p-4 rounded-2xl text-sm bg-white border border-gray-100 text-gray-400 italic rounded-tl-sm shadow-sm">
                  AI is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-gray-100 flex gap-3"
          >
            <input
              type="text"
              placeholder="Ask about your spending..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!insights && messages.length === 1} // Disables chat until they upload
              className="flex-1 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;

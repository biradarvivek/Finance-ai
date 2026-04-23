import React, { useEffect, useState } from "react";
import axios from "axios";

// Import our new clean components
import UploadCard from "./components/UploadCard";
import ChatBox from "./components/ChatBox";
import AnalysisDashboard from "./components/AnalysisDashboard";

export default function App() {
  // 1. App State
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [insights, setInsights] = useState(null);

  // 2. Chat State
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! Upload your bank statement, and ask me anything about your spending.",
    },
  ]);

  // 3. Analysis State
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedCurrent, setSelectedCurrent] = useState("");
  const [selectedPrevious, setSelectedPrevious] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- FUNCTIONS ---
  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF first!");

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload",
        formData,
      );
      setInsights({
        totalTransactions: res.data.count || 0,
        message: "PDF processed securely!",
      });
      fetchAvailableMonths(); // Fetch months immediately after success
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to process the PDF. Ensure servers are running.");
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

  const fetchAnalysis = async () => {
    if (!selectedCurrent || !selectedPrevious) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/analysis/compare?current=${selectedCurrent}&previous=${selectedPrevious}`,
      );
      setDeepAnalysis(res.data);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("No data found for these months.");
      setDeepAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await axios.get(`http://localhost:5000/api/chat`, {
        params: { query: userMsg },
      });
      setMessages((prev) => [...prev, { role: "ai", text: res.data.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to the AI brain." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- RENDER LAYOUT ---
  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            AI Financial Agent
          </h1>
          <p className="text-gray-500 mt-1">
            Upload, query, and analyze your bank statements securely.
          </p>
        </header>

        {/* Top Row: Split 1/3 Upload, 2/3 Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload & Insights */}
          <div className="lg:col-span-1">
            <UploadCard
              file={file}
              setFile={setFile}
              uploadFile={uploadFile}
              isUploading={isUploading}
              insights={insights}
            />
          </div>

          {/* Right Column: Chatbot */}
          <div className="lg:col-span-2">
            <ChatBox
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendMessage={handleSendMessage}
              isTyping={isTyping}
              insights={insights}
            />
          </div>
        </div>

        {/* Bottom Row: Full Width Analysis Dashboard */}
        {insights && (
          <AnalysisDashboard
            availableMonths={availableMonths}
            selectedCurrent={selectedCurrent}
            setSelectedCurrent={setSelectedCurrent}
            selectedPrevious={selectedPrevious}
            setSelectedPrevious={setSelectedPrevious}
            isAnalyzing={isAnalyzing}
            fetchAnalysis={fetchAnalysis}
            deepAnalysis={deepAnalysis}
          />
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import axios from "axios";

// Components
import UploadCard from "./components/UploadCard";
import ChatBox from "./components/ChatBox";
import AnalysisDashboard from "./components/AnalysisDashboard";
import Auth from "./components/Auth"; // 👈 NEW IMPORT

// 🔄 AXIOS INTERCEPTOR: The Silent Refresher
axios.interceptors.response.use(
  (response) => response, // If the request succeeds, just return it normally
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't already tried to retry this request...
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark this request so we don't get stuck in an infinite loop

      try {
        const currentRefreshToken = localStorage.getItem("refreshToken");

        // Ask Node.js for a new pair of tokens
        const res = await axios.post(
          "http://localhost:5000/api/auth/refresh-token",
          {
            refreshToken: currentRefreshToken,
          },
        );

        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken;

        // Save the fresh tokens to the browser
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // Update the failed request with the NEW access token
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        // 🚀 Retry the exact same request that failed, silently!
        return axios(originalRequest);
      } catch (refreshError) {
        // If the Refresh Token itself is expired, it's game over. Force logout.
        console.error("Session completely expired. Please log in again.");
        localStorage.clear();
        window.location.reload(); // Refresh the page to show the Auth screen
      }
    }

    return Promise.reject(error);
  },
);

export default function App() {
  // 🔒 AUTHENTICATION STATE
  const [token, setToken] = useState(
    localStorage.getItem("accessToken") || null,
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null,
  );

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

  // 🔄 RECOVERY SYSTEM: Restore Dashboard & Chat on Page Load
  useEffect(() => {
    const restoreDashboard = async () => {
      if (!token) return; // Only run if the user is logged in

      try {
        // 1. Check if the user already has transactions in MongoDB
        const statusRes = await axios.get(
          "http://localhost:5000/api/analysis/status",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // If they have data, unlock the dashboard!
        if (statusRes.data.hasData) {
          setInsights({
            totalTransactions: statusRes.data.totalTransactions,
            message: "Data securely loaded from your vault.",
          });

          // Fetch the months so the "Monthly Breakdown" dropdowns work immediately
          fetchAvailableMonths();
        }

        // 2. Fetch the Chat History
        const chatRes = await axios.get(
          "http://localhost:5000/api/chat/history",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (chatRes.data.length > 0) {
          // Format the database messages to match our UI state
          const formattedHistory = chatRes.data.map((msg) => ({
            role: msg.role,
            text: msg.text,
          }));

          setMessages([
            {
              role: "ai",
              text: "Welcome back! Your chat history is restored.",
            },
            ...formattedHistory,
          ]);
        }
      } catch (error) {
        console.error("Failed to restore dashboard:", error);
      }
    };

    restoreDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // This triggers every time the 'token' loads

  // 🔒 HANDLE SUCCESSFUL LOGIN/SIGNUP
  const handleAuthSuccess = (authData) => {
    setToken(authData.accessToken);
    setUser(authData.user);
    // Save to browser storage so they stay logged in after refresh
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData.user));
  };

  // 🔒 HANDLE LOGOUT
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    // Clear dashboard data
    setInsights(null);
    setDeepAnalysis(null);
    setMessages([{ role: "ai", text: "Please log in to continue." }]);
  };

  // --- FUNCTIONS (Upload, Chat, Analysis) ---
  // (Keep all your existing uploadFile, fetchAvailableMonths, fetchAnalysis, and handleSendMessage functions exactly the same for now)
  // ... [YOUR EXISTING FUNCTIONS HERE] ...

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
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`, // 👈 NEW: Send the VIP pass!
          },
        },
      );
      setInsights({
        totalTransactions: res.data.count || 0,
        message: "PDF processed securely!",
      });
      fetchAvailableMonths();
    } catch (error) {
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAvailableMonths = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/analysis/months", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableMonths(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedCurrent || !selectedPrevious) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/analysis/compare?current=${selectedCurrent}&previous=${selectedPrevious}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Received Analysis Data:", res.data); // 🚀 Debug: See the raw data from the backend
      setDeepAnalysis(res.data);
    } catch (error) {
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
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => [...prev, { role: "ai", text: res.data.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to AI." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // 🛑 IF NOT LOGGED IN, SHOW AUTH SCREEN
  if (!token) {
    return <Auth onLoginSuccess={handleAuthSuccess} />;
  }

  // ✅ IF LOGGED IN, SHOW MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col">
        {/* Header with Logout Button */}
        <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              AI Financial Agent
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Welcome back, {user?.fullName || user?.email}!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Logout
          </button>
        </header>

        {/* Top Row: Split 1/3 Upload, 2/3 Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <UploadCard
              file={file}
              setFile={setFile}
              uploadFile={uploadFile}
              isUploading={isUploading}
              insights={insights}
            />
          </div>
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

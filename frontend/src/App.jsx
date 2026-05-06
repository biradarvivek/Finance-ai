import React, { useEffect, useState } from "react";
import axios from "axios";

// Components
import UploadCard from "./components/UploadCard";
import ChatBox from "./components/ChatBox";
import AnalysisDashboard from "./components/AnalysisDashboard";
import Auth from "./components/Auth";

// 🔄 AXIOS INTERCEPTOR: The Silent Refresher
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const currentRefreshToken = localStorage.getItem("refreshToken");
        const res = await axios.post(`${API_URL}/api/auth/refresh-token`, {
          refreshToken: currentRefreshToken,
        });
        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken;
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error("Session completely expired. Please log in again.");
        localStorage.clear();
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export default function App() {
  // This will use your Render URL in production, but fall back to localhost when you are coding on your machine!
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [token, setToken] = useState(
    localStorage.getItem("accessToken") || null,
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null,
  );
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Welcome to the Vault. Upload your encrypted statement or ask me anything about your spending architecture.",
    },
  ]);
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedCurrent, setSelectedCurrent] = useState("");
  const [selectedPrevious, setSelectedPrevious] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const restoreDashboard = async () => {
      if (!token) return;
      try {
        const statusRes = await axios.get(`${API_URL}/api/analysis/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statusRes.data.hasData) {
          setInsights({
            totalTransactions: statusRes.data.totalTransactions,
            message: "Vault data decrypted & loaded.",
          });
          fetchAvailableMonths();
        }
        const chatRes = await axios.get(`${API_URL}/api/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (chatRes.data.length > 0) {
          const formattedHistory = chatRes.data.map((msg) => ({
            role: msg.role,
            text: msg.text,
          }));
          setMessages([
            { role: "ai", text: "Welcome back. Neural link restored." },
            ...formattedHistory,
          ]);
        }
      } catch (error) {
        console.error("Failed to restore dashboard:", error);
      }
    };
    restoreDashboard();
  }, [token]);

  const handleAuthSuccess = (authData) => {
    setToken(authData.accessToken);
    setUser(authData.user);
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData.user));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.clear();
    setInsights(null);
    setDeepAnalysis(null);
    setMessages([{ role: "ai", text: "Session terminated. Please log in." }]);
  };

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return alert("Select a secure PDF matrix first.");
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setInsights({
        totalTransactions: res.data.count || 0,
        message: "Matrix parsed securely!",
      });
      fetchAvailableMonths();
    } catch (error) {
      alert("Upload failed. Core breach.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAvailableMonths = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/analysis/months`, {
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
        `${API_URL}/api/analysis/compare?current=${selectedCurrent}&previous=${selectedPrevious}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
      const res = await axios.get(`${API_URL}/api/chat`, {
        params: { query: userMsg },
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => [...prev, { role: "ai", text: res.data.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Neural link severed. Retrying connection." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!token) return <Auth onLoginSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        {/* Glass Header */}
        <header className="flex justify-between items-center bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="font-bold text-white text-xl tracking-tighter">
                AI
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Fin AI
              </h1>
              <p className="text-cyan-400 text-xs font-mono uppercase tracking-widest">
                User: {user?.username || user?.email} // Status: Active
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-900 hover:bg-slate-950 text-slate-300 border border-slate-700 hover:border-rose-500/50 font-semibold px-5 py-2 rounded-xl transition-all duration-300 text-sm"
          >
            Disconnect
          </button>
        </header>

        {/* Bento Grid Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
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

        {/* Bottom Row Analysis */}
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

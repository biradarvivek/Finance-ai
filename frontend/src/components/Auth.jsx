import React, { useState } from "react";
import axios from "axios";

export default function Auth({ onLoginSuccess }) {
  // This will use your Render URL in production, but fall back to localhost when you are coding on your machine!
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    username: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      onLoginSuccess(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Neural breach detected. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-10 shadow-2xl shadow-black/50 relative z-10">
        <div className="text-center mb-10">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6">
            <span className="font-bold text-white text-2xl tracking-tighter">
              AI
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isLogin ? "System Access" : "Initialize Matrix"}
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            {isLogin
              ? "Enter your credentials to access the vault."
              : "Register to encrypt your financial data."}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl text-sm text-center mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-slate-600"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Alias
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-slate-600"
                  placeholder="johnny5"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Email Node
            </label>
            <input
              type="email"
              name="email"
              required
              onChange={handleChange}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-slate-600"
              placeholder="you@domain.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Encryption Key
            </label>
            <input
              type="password"
              name="password"
              required
              onChange={handleChange}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 mt-4 tracking-wide"
          >
            {isLoading
              ? "Authenticating..."
              : isLogin
                ? "DECRYPT & ENTER"
                : "INITIALIZE PROTOCOL"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "No vault access? " : "Already encrypted? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors"
          >
            {isLogin ? "Request link" : "Sign in here"}
          </button>
        </div>
      </div>
    </div>
  );
}

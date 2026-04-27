import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatBox({
  messages,
  chatInput,
  setChatInput,
  handleSendMessage,
  isTyping,
  insights,
}) {
  const endOfMessagesRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl flex flex-col h-[650px] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-white/10 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Agent Terminal
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Awaiting direct command input...
            </p>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-5 text-sm leading-relaxed shadow-lg backdrop-blur-md ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-3xl rounded-tr-sm border border-cyan-400/20"
                  : "bg-slate-900/80 border border-slate-700/50 text-slate-200 rounded-3xl rounded-tl-sm"
              }`}
            >
              {msg.role === "user" ? (
                <p>{msg.text}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-cyan-400 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-slate-700 prose-th:bg-slate-800 prose-th:p-2 prose-td:border prose-td:border-slate-700 prose-td:p-2">
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
            <div className="max-w-[50%] p-4 bg-slate-900/80 border border-slate-700/50 rounded-3xl rounded-tl-sm flex gap-2 items-center">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-slate-900/50 border-t border-white/10 flex gap-3 m-2 rounded-2xl"
      >
        <input
          type="text"
          placeholder={
            insights ? "Query the matrix..." : "System locked. Require data."
          }
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={!insights}
          className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:outline-none px-4"
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || !insights}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
        >
          Execute
        </button>
      </form>
    </div>
  );
}

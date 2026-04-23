import React from "react";
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
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-[600px]">
      <div className="bg-gray-50 border-b border-gray-100 p-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Financial AI Assistant
        </h2>
        <p className="text-xs text-gray-500">
          Ask questions about your uploaded statement
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
              }`}
            >
              {msg.role === "user" ? (
                msg.text
              ) : (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-200 prose-td:p-2">
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
            <div className="max-w-[75%] p-4 rounded-2xl text-sm bg-white border border-gray-100 text-gray-400 italic rounded-tl-sm shadow-sm animate-pulse">
              AI is analyzing data...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-white border-t border-gray-100 flex gap-3"
      >
        <input
          type="text"
          placeholder={
            insights
              ? "E.g., How much did I spend on food?"
              : "Upload a statement first..."
          }
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={!insights}
          className="flex-1 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || !insights}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

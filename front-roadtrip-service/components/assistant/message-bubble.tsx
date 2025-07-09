"use client";

import { Bot, User } from "lucide-react";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt?: string;
  };
  showTimestamp?: boolean;
  formatDate?: (date: string) => string;
}

export const MessageBubble = memo(
  ({ message, showTimestamp = true, formatDate }: MessageBubbleProps) => {
    return (
      <div
        className={`flex ${
          message.role === "user" ? "justify-end" : "justify-start"
        } items-start gap-3`}
      >
        {/* Avatar assistant */}
        {message.role === "assistant" && (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-red-600" />
          </div>
        )}

        {/* Bulle de message */}
        <div
          className={`max-w-xs sm:max-w-md md:max-w-2xl p-4 md:p-5 rounded-2xl text-sm md:text-base whitespace-pre-wrap leading-relaxed shadow-sm ${
            message.role === "assistant"
              ? "bg-white text-stone-800 border border-stone-200"
              : "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md"
          }`}
        >
          {message.role === "assistant" ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-2">{children}</ul>
                ),
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold my-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold my-2">{children}</h2>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            message.content
          )}

          {showTimestamp && message.createdAt && formatDate && (
            <div
              className={`mt-2 text-xs ${
                message.role === "assistant" ? "text-stone-400" : "text-red-100"
              }`}
            >
              {formatDate(message.createdAt)}
            </div>
          )}
        </div>

        {/* Avatar utilisateur */}
        {message.role === "user" && (
          <div className="flex-shrink-0 w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-stone-600" />
          </div>
        )}
      </div>
    );
  }
);

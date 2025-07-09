"use client";

import { Bot } from "lucide-react";
import { memo } from "react";

interface TypingIndicatorProps {
  message?: string;
}

export const TypingIndicator = memo(({ 
  message = "L'assistant réfléchit..." 
}: TypingIndicatorProps) => {
  return (
    <div className="flex justify-start items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
        <Bot className="h-5 w-5 text-red-600" />
      </div>
      <div className="bg-white text-stone-500 p-4 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-3">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="text-sm text-stone-500">{message}</span>
      </div>
    </div>
  );
});
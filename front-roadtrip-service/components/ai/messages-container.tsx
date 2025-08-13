// components/chat/MessagesContainer.tsx
"use client";

import { forwardRef } from "react";
import { MessageBubble } from "@/components/ai/message-bubble";
import { TypingIndicator } from "@/components/ai/typing-indicator";
import { MessageSquare } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface MessagesContainerProps {
  messages: Message[];
  isLoading?: boolean;
  showTimestamp?: boolean;
  formatDate?: (date: string) => string;
  emptyStateMessage?: string;
  className?: string;
  lastMessageRef?: React.RefObject<HTMLDivElement>;
}

export const MessagesContainer = forwardRef<HTMLDivElement, MessagesContainerProps>(
  ({ 
    messages, 
    isLoading = false, 
    showTimestamp = false, 
    formatDate,
    emptyStateMessage = "Aucun message dans cette conversation",
    className = "",
    lastMessageRef
  }, containerRef) => {
    return (
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto scroll-smooth ${className}`}
        style={{
          scrollBehavior: "smooth",
          overflowAnchor: "none"
        }}
      >
        <div className="p-4 md:p-8 space-y-6 bg-gradient-to-b from-stone-50 to-stone-100 min-h-full">
          {/* État vide */}
          {messages.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-stone-400 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{emptyStateMessage}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                return (
                  <div 
                    key={message.id}
                    ref={isLastMessage ? lastMessageRef : undefined}
                  >
                    <MessageBubble
                      message={message}
                      showTimestamp={showTimestamp}
                      formatDate={formatDate}
                    />
                  </div>
                );
              })}

              {/* Indicateur de frappe */}
              {isLoading && (
                <div className="animate-pulse">
                  <TypingIndicator />
                </div>
              )}
            </>
          )}

          {/* Padding en bas pour éviter que le dernier message soit collé au input */}
          <div className="h-6 w-full flex-shrink-0" />
        </div>
      </div>
    );
  }
);

MessagesContainer.displayName = "MessagesContainer";
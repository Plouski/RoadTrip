"use client";

import { useParams } from "next/navigation";
import Loading from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ChatLayout } from "@/components/ai/chat-layout";
import { MessagesContainer } from "@/components/ai/messages-container";
import { ChatInput } from "@/components/ai/chat-input";
import { useConversation } from "@/hooks/useConversation";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;

  const {
    refs: { inputRef, messagesEndRef, containerRef },
    state: {
      loading,
      isCheckingAuth,
      submitting,
      error,
      title,
      sidebarOpen,
      formattedMessages,
      input,
    },
    actions: {
      handleSubmit,
      handleInputChange,
      startNewSession,
      toggleSidebar,
      formatDate,
    },
  } = useConversation(conversationId);

  if (isCheckingAuth || loading) {
    return <Loading text="Chargement de la conversation..." />;
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-stone-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 max-w-md text-center mb-6 shadow-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-3 text-red-500" />
          <p>{error}</p>
        </div>
        <Link href="/ai/history">
          <Button variant="outline" className="flex items-center gap-2 hover:bg-stone-50">
            <ChevronLeft className="h-4 w-4" />
            Retour à l'historique
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ChatLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={toggleSidebar}
      onNewConversation={startNewSession}
      title={title}
      subtitle={submitting ? "En train de réfléchir..." : "Conversation active"}
      isLoading={submitting}
      currentTitle={title}
      showCurrentConversation={true}
    >
      <MessagesContainer
        ref={containerRef}
        messages={formattedMessages}
        isLoading={submitting}
        showTimestamp
        formatDate={formatDate}
        lastMessageRef={messagesEndRef}
      />

      <div className="flex-shrink-0 border-t border-stone-200 bg-white/80 backdrop-blur-sm">
        <ChatInput
          ref={inputRef}
          value={input}
          onSubmit={handleSubmit}
          onChange={handleInputChange}
          disabled={submitting}
        />
      </div>
    </ChatLayout>
  );
}

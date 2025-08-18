"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChat } from "@/hooks/useChat";
import { useAuthentication } from "@/hooks/useAuthentication";
import Loading from "@/components/ui/loading";
import { ChatLayout } from "@/components/ai/chat-layout";
import { MessagesContainer } from "@/components/ai/messages-container";
import { ChatInput } from "@/components/ai/chat-input";

export default function AssistantPage() {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // États
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Hooks personnalisés
  const { messagesEndRef, containerRef, scrollToBottom, scrollToLastMessage, scrollToBottomOnMount } = useAutoScroll();
  const { isCheckingAuth, checkAuthentication } = useAuthentication();
  const { messages, isLoading, sendMessage, setInitialMessages } = useChat({
    conversationId,
    onScroll: () => scrollToBottom(true),
    onScrollToMessage: () => scrollToLastMessage()
  });

  // Gestion des actions
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    await sendMessage(input);
    setInput("");
  }, [input, sendMessage]);

  const startNewSession = useCallback(() => {
    const newConversationId = crypto.randomUUID();
    setConversationId(newConversationId);
    
    setInitialMessages([{
      id: "welcome",
      role: "assistant",
      content: "✨ Nouvelle session démarrée !\nJe suis prêt à vous aider à planifier votre roadtrip !"
    }]);

    setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom(true);
    }, 100);
    
    if (isMobile) setSidebarOpen(false);
    toast.success("🎉 Nouvelle conversation démarrée");
  }, [isMobile, setInitialMessages, scrollToBottom]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      const isAuth = await checkAuthentication();
      if (isAuth) {
        setInitialMessages([{
          id: "welcome",
          role: "assistant",
          content: "Bonjour ! Je suis votre assistant ROADTRIP! \nPosez-moi vos questions sur vos prochains voyages !"
        }]);
        
        // Scroll au dernier message après initialisation
        setTimeout(() => {
          inputRef.current?.focus();
          scrollToBottomOnMount();
        }, 100);
      }
    };

    initialize();
  }, [checkAuthentication, setInitialMessages, scrollToBottomOnMount]);

  // Gestion responsive sidebar
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Auto-scroll sur changement de messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        setTimeout(() => scrollToLastMessage(), 100);
      } else {
        setTimeout(() => scrollToBottom(), 100);
      }
    }
  }, [messages.length, scrollToBottom, scrollToLastMessage]);

  // Auto-scroll pendant loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      scrollToLastMessage();
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading, scrollToLastMessage]);

  if (isCheckingAuth) {
    return <Loading text="Chargement de l'assistant..." />;
  }

  return (
    <ChatLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={toggleSidebar}
      onNewConversation={startNewSession}
      isLoading={isLoading}
    >
      {/* Zone des messages */}
      <MessagesContainer
        ref={containerRef}
        messages={messages}
        isLoading={isLoading}
        emptyStateMessage="Commencez une conversation avec votre assistant ROADTRIP!"
        lastMessageRef={messagesEndRef}
      />

      {/* Zone de saisie */}
      <div className="flex-shrink-0 border-t border-stone-200 bg-white/80 backdrop-blur-sm">
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isLoading}
          isMobile={isMobile}
        />
      </div>
    </ChatLayout>
  );
}
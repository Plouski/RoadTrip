"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { AiService } from "@/services/ai-service";
import { formatAiResponse } from "@/lib/formatAiResponse";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useAuthentication } from "@/hooks/useAuthentication";
import Loading from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ChatLayout } from "@/components/assistant/chat-layout";
import { MessagesContainer } from "@/components/assistant/messages-container";
import { ChatInput } from "@/components/assistant/chat-input";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationId: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  // États
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationTitle, setConversationTitle] = useState("Conversation");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks personnalisés - AVEC scrollToLastMessage
  const { messagesEndRef, containerRef, scrollToBottom, scrollToLastMessage, scrollToBottomOnMount } = useAutoScroll();
  const { isCheckingAuth, checkAuthentication } = useAuthentication();

  // Utilitaires
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const formatPattern = isMobile ? "d MMM, HH:mm" : "d MMM yyyy à HH:mm";
      return format(date, formatPattern, { locale: fr });
    } catch {
      return "";
    }
  }, [isMobile]);

  const generateConversationTitle = useCallback((messagesArray: Message[]): string => {
    const firstUserMessage = messagesArray.find((msg) => msg.role === "user");
    if (!firstUserMessage) return "Conversation";

    const content = firstUserMessage.content;
    const maxLength = isMobile ? 25 : 35;
    return content.length > maxLength
      ? `${content.substring(0, maxLength)}...`
      : content;
  }, [isMobile]);

  // Chargement de la conversation
  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setError("ID de conversation manquant");
      return;
    }

    try {
      const result = await AiService.getConversationById(conversationId);
      let messagesArray: Message[] = [];

      if (Array.isArray(result)) {
        messagesArray = result;
      } else if (result && typeof result === "object") {
        messagesArray = result.messages || result.data || [];
      }

      if (!Array.isArray(messagesArray)) {
        messagesArray = [];
      }

      setMessages(messagesArray);

      if (messagesArray.length > 0) {
        const title = generateConversationTitle(messagesArray);
        setConversationTitle(title);
      }

      setError(null);

      // Scroll au dernier message après chargement (rechargement de page)
      setTimeout(() => {
        scrollToBottomOnMount();
        inputRef.current?.focus();
      }, 300);
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
      setError("Erreur lors du chargement de la conversation.");
    }
  }, [conversationId, generateConversationTitle, scrollToBottomOnMount]);

  // Envoi de message - MODIFIÉ pour scroll intelligent
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userMessage: Message = {
      _id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
      conversationId,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsSubmitting(true);

    // Scroll normal pour message utilisateur
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await AiService.saveMessage("user", currentInput, conversationId);

      const result = await AiService.askAssistant(currentInput, {
        includeWeather: true,
        conversationId,
      });

      let formatted: string;
      if (typeof result === "string") {
        try {
          const parsed = JSON.parse(result);
          formatted = formatAiResponse(parsed);
        } catch {
          formatted = result;
        }
      } else if (result && typeof result === "object") {
        formatted = formatAiResponse(result);
      } else {
        formatted = "❌ Réponse invalide reçue de l'assistant.";
      }

      const assistantMessage: Message = {
        _id: (Date.now() + 1).toString(),
        role: "assistant",
        content: formatted,
        createdAt: new Date().toISOString(),
        conversationId,
      };

      setMessages(prev => [...prev, assistantMessage]);

      await AiService.saveMessage("assistant", formatted, conversationId);
      toast.success("Message envoyé avec succès");
      
      // 🎯 SCROLL AU DÉBUT du message assistant pour mieux lire
      setTimeout(() => scrollToLastMessage(), 200);
      
    } catch (error) {
      console.error("Erreur:", error);

      const errorMessage: Message = {
        _id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ **Erreur technique**\n\nDétails : ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }\n\nVeuillez réessayer.`,
        createdAt: new Date().toISOString(),
        conversationId,
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error("Erreur lors de l'appel à l'IA");
      
      // 🎯 SCROLL AU DÉBUT du message d'erreur
      setTimeout(() => scrollToLastMessage(), 200);
    } finally {
      setIsSubmitting(false);
    }
  }, [input, isSubmitting, conversationId, scrollToBottom, scrollToLastMessage]);

  // Actions
  const startNewSession = useCallback(() => {
    router.push("/ai");
  }, [router]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  // Initialisation
  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      const isAuthenticated = await checkAuthentication();
      if (isAuthenticated) {
        await loadConversation();
      }
      setIsLoading(false);
    };

    initializePage();
  }, [checkAuthentication, loadConversation]);

  // Gestion responsive
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // 🎯 AUTO-SCROLL INTELLIGENT basé sur le type de message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        // Scroll au DÉBUT du message assistant pour mieux lire
        setTimeout(() => scrollToLastMessage(), 100);
      } else {
        // Scroll normal pour les messages utilisateur
        setTimeout(() => scrollToBottom(), 100);
      }
    }
  }, [messages.length, scrollToBottom, scrollToLastMessage]);

  // 🎯 AUTO-SCROLL pendant que l'IA tape (au début du message)
  useEffect(() => {
    if (!isSubmitting) return;

    const interval = setInterval(() => {
      scrollToLastMessage(); // Pas scrollToBottom !
    }, 500);

    return () => clearInterval(interval);
  }, [isSubmitting, scrollToLastMessage]);

  // Composant d'erreur
  if (isCheckingAuth || isLoading) {
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

  // Conversion des messages pour le composant
  const formattedMessages = messages.map(msg => ({
    id: msg._id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt
  }));

  return (
    <ChatLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={toggleSidebar}
      onNewConversation={startNewSession}
      title={conversationTitle}
      subtitle={isSubmitting ? "En train de réfléchir..." : "Conversation active"}
      isLoading={isSubmitting}
      currentTitle={conversationTitle}
      showCurrentConversation={true}
    >
      {/* Zone des messages */}
      <MessagesContainer
        ref={containerRef}
        messages={formattedMessages}
        isLoading={isSubmitting}
        showTimestamp={true}
        formatDate={formatDate}
        lastMessageRef={messagesEndRef}
      />

      {/* Zone de saisie */}
      <div className="flex-shrink-0 border-t border-stone-200 bg-white/80 backdrop-blur-sm">
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isSubmitting}
          isMobile={isMobile}
        />
      </div>
    </ChatLayout>
  );
}
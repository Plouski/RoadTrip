import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AiService } from "@/services/ai-service";
import { formatAiResponse } from "@/lib/formatAiResponse";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface UseChatOptions {
  conversationId: string;
  onScroll?: () => void;
  onScrollToMessage?: () => void;
}

export const useChat = ({ conversationId, onScroll, onScrollToMessage }: UseChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((message: Message, isAssistant = false) => {
    setMessages(prev => [...prev, message]);
    
    // Si c'est un message assistant, scroll au début du message
    // Si c'est un message utilisateur, scroll normal
    if (isAssistant && onScrollToMessage) {
      setTimeout(onScrollToMessage, 50);
    } else if (onScroll) {
      setTimeout(onScroll, 50);
    }
  }, [onScroll, onScrollToMessage]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };

    addMessage(userMessage, false); // Message utilisateur
    setIsLoading(true);

    try {
      // Sauvegarder le message utilisateur
      await AiService.saveMessage("user", content, conversationId);

      // Appeler l'assistant IA
      const result = await AiService.askAssistant(content, {
        includeWeather: true,
        conversationId
      });

      // Formater la réponse
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
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: formatted,
        createdAt: new Date().toISOString()
      };

      addMessage(assistantMessage, true); // Message assistant - scroll au début

      // Sauvegarder la réponse
      await AiService.saveMessage("assistant", formatted, conversationId);
      
      toast.success("Message envoyé avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ **Erreur technique**\n\nDétails : ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }\n\nVeuillez réessayer.`,
        createdAt: new Date().toISOString()
      };

      addMessage(errorMessage, true); // Message d'erreur - scroll au début
      toast.error("Erreur lors de l'appel à l'IA");
    } finally {
      setIsLoading(false);
      // Pas de scroll supplémentaire ici, c'est géré dans addMessage
    }
  }, [conversationId, isLoading, addMessage, onScroll]);

  const setInitialMessages = useCallback((initialMessages: Message[]) => {
    setMessages(initialMessages);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    setInitialMessages,
    addMessage
  };
};
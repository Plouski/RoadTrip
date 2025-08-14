"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AiService } from "@/services/ai-service";
import { formatAiResponse } from "@/lib/formatAiResponse";
import { useIsMobile } from "@/hooks/useMobile";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useAuthentication } from "@/hooks/useAuthentication";
import { formatDateFR } from "@/lib/formatDateFR";

export interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationId: string;
}

type State = {
  messages: Message[];
  input: string;
  title: string;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  sidebarOpen: boolean;
};

type Actions = {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleInputChange: (v: string) => void;
  startNewSession: () => void;
  toggleSidebar: () => void;
  formatDate: (iso: string) => string;
};

export function useConversation(conversationId: string | undefined) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isCheckingAuth, checkAuthentication } = useAuthentication();

  const [state, setState] = useState<State>({
    messages: [],
    input: "",
    title: "Conversation",
    loading: true,
    submitting: false,
    error: null,
    sidebarOpen: !isMobile, // par défaut: ouvert sur desktop
  });

  // refs & scroll
  const inputRef = useRef<HTMLInputElement>(null);
  const { messagesEndRef, containerRef, scrollToBottom, scrollToLastMessage, scrollToBottomOnMount } =
    useAutoScroll();

  // utils
  const formatDate = useCallback(
    (iso: string) => formatDateFR(iso, isMobile),
    [isMobile]
  );

  const setPartial = useCallback(
    (patch: Partial<State>) => setState((s) => ({ ...s, ...patch })),
    []
  );

  const generateTitle = useCallback(
    (msgs: Message[]) => {
      const firstUser = msgs.find((m) => m.role === "user");
      if (!firstUser) return "Conversation";
      const max = isMobile ? 25 : 35;
      return firstUser.content.length > max
        ? `${firstUser.content.slice(0, max)}...`
        : firstUser.content;
    },
    [isMobile]
  );

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setPartial({ error: "ID de conversation manquant", loading: false });
      return;
    }

    try {
      const result = await AiService.getConversationById(conversationId);
      const messages: Message[] = Array.isArray(result)
        ? result
        : result?.messages || result?.data || [];

      const safe = Array.isArray(messages) ? messages : [];
      setPartial({
        messages: safe,
        title: safe.length ? generateTitle(safe) : "Conversation",
        error: null,
      });

      setTimeout(() => {
        scrollToBottomOnMount();
        inputRef.current?.focus();
      }, 200);
    } catch (e) {
      setPartial({ error: "Erreur lors du chargement de la conversation." });
    }
  }, [conversationId, generateTitle, scrollToBottomOnMount, setPartial]);

  // init
  useEffect(() => {
    (async () => {
      setPartial({ loading: true });
      const ok = await checkAuthentication();
      if (ok) await loadConversation();
      setPartial({ loading: false });
    })();
  }, [checkAuthentication, loadConversation, setPartial]);

  // responsive: open/close sidebar auto
  useEffect(() => {
    setPartial({ sidebarOpen: !isMobile });
  }, [isMobile, setPartial]);

  // auto-scroll suivant le type de message
  useEffect(() => {
    if (!state.messages.length) return;
    const last = state.messages[state.messages.length - 1];
    const fn = last.role === "assistant" ? scrollToLastMessage : scrollToBottom;
    const t = setTimeout(() => fn(), 80);
    return () => clearTimeout(t);
  }, [state.messages.length, scrollToBottom, scrollToLastMessage, state.messages]);

  // auto-scroll pendant génération
  useEffect(() => {
    if (!state.submitting) return;
    const id = setInterval(() => scrollToLastMessage(), 400);
    return () => clearInterval(id);
  }, [state.submitting, scrollToLastMessage]);

  // actions
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!state.input.trim() || state.submitting || !conversationId) return;

      const userMessage: Message = {
        _id: Date.now().toString(),
        role: "user",
        content: state.input,
        createdAt: new Date().toISOString(),
        conversationId,
      };

      // append user message + start submit
      setPartial({
        messages: [...state.messages, userMessage],
        input: "",
        submitting: true,
      });

      setTimeout(() => scrollToBottom(true), 40);

      try {
        await AiService.saveMessage("user", userMessage.content, conversationId);

        const result = await AiService.askAssistant(userMessage.content, {
          includeWeather: true,
          conversationId,
        });

        const formatted =
          typeof result === "string"
            ? (() => {
                try {
                  const parsed = JSON.parse(result);
                  return formatAiResponse(parsed);
                } catch {
                  return result;
                }
              })()
            : result && typeof result === "object"
            ? formatAiResponse(result)
            : "❌ Réponse invalide reçue de l'assistant.";

        const assistantMessage: Message = {
          _id: (Date.now() + 1).toString(),
          role: "assistant",
          content: formatted,
          createdAt: new Date().toISOString(),
          conversationId,
        };

        setPartial({
          messages: [...state.messages, userMessage, assistantMessage],
        });

        await AiService.saveMessage("assistant", formatted, conversationId);
        toast.success("Message envoyé avec succès");
        setTimeout(() => scrollToLastMessage(), 160);
      } catch (err: any) {
        const errorMessage: Message = {
          _id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ **Erreur technique**\n\nDétails : ${
            err instanceof Error ? err.message : "Erreur inconnue"
          }\n\nVeuillez réessayer.`,
          createdAt: new Date().toISOString(),
          conversationId,
        };
        setPartial({ messages: [...state.messages, userMessage, errorMessage] });
        toast.error("Erreur lors de l'appel à l'IA");
        setTimeout(() => scrollToLastMessage(), 160);
      } finally {
        setPartial({ submitting: false });
      }
    },
    [
      state.input,
      state.submitting,
      state.messages,
      conversationId,
      setPartial,
      scrollToBottom,
      scrollToLastMessage,
    ]
  );

  const handleInputChange = useCallback((v: string) => {
    setPartial({ input: v });
  }, [setPartial]);

  const startNewSession = useCallback(() => {
    router.push("/ai");
  }, [router]);

  const toggleSidebar = useCallback(() => {
    setPartial({ sidebarOpen: !state.sidebarOpen });
  }, [state.sidebarOpen, setPartial]);

  const formattedMessages = useMemo(
    () =>
      state.messages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    [state.messages]
  );

  return {
    refs: { inputRef, messagesEndRef, containerRef },
    state: {
      ...state,
      isCheckingAuth,
      formattedMessages,
    },
    actions: {
      handleSubmit,
      handleInputChange,
      startNewSession,
      toggleSidebar,
      formatDate,
    } as Actions,
  };
}
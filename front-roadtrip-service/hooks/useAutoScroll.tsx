import { useCallback, useRef, useEffect } from "react";

export const useAutoScroll = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((force = false) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollOptions: ScrollBehavior = force ? "auto" : "smooth";

    // Scroll directement vers le bas du conteneur
    container.scrollTo({
      top: container.scrollHeight,
      behavior: scrollOptions
    });

    // Double scroll pour garantir la position en cas de contenu dynamique
    if (force) {
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "auto"
        });
      }, 100);
    }
  }, []);

  const scrollToLastMessage = useCallback((force = false) => {
    if (!lastMessageRef.current || !containerRef.current) return;

    const scrollOptions: ScrollIntoViewOptions = {
      behavior: force ? "auto" : "smooth",
      block: "start", // Scroll au début du message pour mieux lire
      inline: "nearest"
    };

    lastMessageRef.current.scrollIntoView(scrollOptions);

    // Double scroll pour garantir la position
    if (force) {
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ 
          behavior: "auto", 
          block: "start" 
        });
      }, 100);
    }
  }, []);

  // Scroll automatique au montage/rechargement (vers le bas complet)
  const scrollToBottomOnMount = useCallback(() => {
    setTimeout(() => {
      scrollToBottom(true);
    }, 300); // Délai plus long pour s'assurer que tout est rendu
  }, [scrollToBottom]);

  return { 
    messagesEndRef, 
    containerRef, 
    lastMessageRef,
    scrollToBottom, 
    scrollToLastMessage,
    scrollToBottomOnMount 
  };
};
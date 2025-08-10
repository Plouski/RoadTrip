"use client";

import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AssistantSidebar } from "@/components/assistant/assistant-sidebar";
import { ChatHeader } from "@/components/assistant/chat-header";
import { SidebarToggle } from "@/components/assistant/sidebar-toggle";

interface ChatLayoutProps {
  children: ReactNode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewConversation: () => void;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  currentTitle?: string;
  showCurrentConversation?: boolean;
}

export const ChatLayout = ({
  children,
  sidebarOpen,
  onToggleSidebar,
  onNewConversation,
  title = "Assistant ROADTRIP!",
  subtitle,
  isLoading = false,
  currentTitle,
  showCurrentConversation = false
}: ChatLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <AssistantSidebar
        isOpen={sidebarOpen}
        onToggle={onToggleSidebar}
        isMobile={isMobile}
        onNewConversation={onNewConversation}
        currentTitle={currentTitle}
        showCurrentConversation={showCurrentConversation}
      />

      {/* Zone principale */}
      <div className="flex-1 flex flex-col w-full min-h-0">
        {/* Header */}
        <ChatHeader
          title={title}
          subtitle={subtitle}
          showMenuButton={!sidebarOpen || isMobile}
          onMenuClick={onToggleSidebar}
          showHistoryButton={true}
          isMobile={isMobile}
          isLoading={isLoading}
        />

        {/* Toggle sidebar (desktop) */}
        <SidebarToggle
          isOpen={sidebarOpen}
          onClick={onToggleSidebar}
          isMobile={isMobile}
        />

        {/* Contenu principal */}
        {children}
      </div>
    </div>
  );
};
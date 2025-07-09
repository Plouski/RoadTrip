"use client";

import { Bot, Download, History, MessageSquare, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { memo } from "react";

interface AssistantSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentTitle?: string;
  showCurrentConversation?: boolean;
  isMobile: boolean;
  onNewConversation: () => void;
  onDownloadPDF: () => void;
  downloadDisabled?: boolean;
}

export const AssistantSidebar = memo(({
  isOpen,
  onToggle,
  currentTitle,
  showCurrentConversation = false,
  isMobile,
  onNewConversation,
  onDownloadPDF,
  downloadDisabled = false
}: AssistantSidebarProps) => {
  if (!isOpen && isMobile) return null;

  return (
    <aside
      className={`
        ${isOpen ? "w-80" : "w-0 md:w-20"} 
        ${isOpen ? "translate-x-0" : isMobile ? "-translate-x-full" : "translate-x-0"}
        transition-all duration-300 ease-in-out 
        flex-shrink-0 border-r border-stone-200 bg-white/95 backdrop-blur-sm
        flex flex-col h-full shadow-lg
        ${isMobile ? "fixed z-30" : "relative"}
      `}
    >
      <div className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className={`${!isOpen && "md:hidden"}`}>
            <h2 className="text-xl font-semibold text-stone-800 flex items-center gap-3">
              <Bot className="h-6 w-6 text-red-600" />
              Assistant ROADTRIP!
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {showCurrentConversation ? "Conversation active" : "Votre guide de voyage intelligent"}
            </p>
          </div>

          {/* Logo minimaliste */}
          <div className={`${isOpen ? "hidden" : "hidden md:flex"} items-center justify-center w-full`}>
            <Bot className="h-8 w-8 text-red-600" />
          </div>

          {/* Bouton fermeture mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="md:hidden hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Actions */}
        <div className={`flex flex-col gap-3 ${!isOpen && "md:items-center"}`}>
          {/* Conversation courante */}
          {showCurrentConversation && currentTitle && (
            <div
              className={`${
                !isOpen
                  ? "md:p-3 md:w-12 md:h-12 md:rounded-full md:justify-center"
                  : "w-full py-4 px-4 rounded-xl"
              } bg-red-50 text-red-600 border border-red-100 flex items-center gap-3`}
            >
              <MessageSquare className="h-5 w-5 flex-shrink-0" />
              <span className={`${!isOpen && "md:hidden"} text-sm font-medium truncate`}>
                {currentTitle}
              </span>
            </div>
          )}

          {/* Nouvelle conversation */}
          <Button
            onClick={onNewConversation}
            variant="default"
            className={`${
              !isOpen
                ? "md:p-3 md:w-12 md:h-12 md:rounded-full md:justify-center"
                : "w-full py-4 rounded-xl justify-start"
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span className={`${!isOpen && "md:hidden"} ml-3 font-medium`}>
              Nouvelle conversation
            </span>
          </Button>

          {/* Historique */}
          <Link href="/ai/history" className="block">
            <Button
              variant="outline"
              className={`${
                !isOpen
                  ? "md:p-3 md:w-12 md:h-12 md:rounded-full md:justify-center"
                  : "w-full py-4 rounded-xl justify-start"
              }`}
            >
              <History className="h-5 w-5 text-stone-600" />
              <span className={`${!isOpen && "md:hidden"} ml-3 text-stone-700`}>
                Historique
              </span>
            </Button>
          </Link>

          {/* Télécharger PDF */}
          <Button
            onClick={onDownloadPDF}
            variant="outline"
            disabled={downloadDisabled}
            className={`${
              !isOpen
                ? "md:p-3 md:w-12 md:h-12 md:rounded-full md:justify-center"
                : "w-full py-4 rounded-xl justify-start"
            }`}
          >
            <Download className="h-5 w-5 text-stone-600" />
            <span className={`${!isOpen && "md:hidden"} ml-3 text-stone-700`}>
              Télécharger PDF
            </span>
          </Button>
        </div>

        {/* Footer */}
        <div className={`mt-auto pt-6 border-t border-stone-100 ${!isOpen && "md:hidden"}`}>
          <p className="text-xs text-stone-500 italic text-center">
            Votre compagnon de voyage intelligent
          </p>
        </div>
      </div>
    </aside>
  );
});
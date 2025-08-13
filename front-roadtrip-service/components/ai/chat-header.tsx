"use client";

import { Bot, History, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { memo } from "react";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  showHistoryButton?: boolean;
  isMobile: boolean;
  isLoading?: boolean;
}

export const ChatHeader = memo(({
  title,
  subtitle,
  showMenuButton = false,
  onMenuClick,
  showHistoryButton = false,
  isMobile,
  isLoading = false
}: ChatHeaderProps) => {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-stone-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="mr-3 hover:bg-stone-100"
            >
              <Menu className="h-6 w-6 text-stone-700" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-red-600" />
            <div>
              <h1 className="text-lg font-semibold text-stone-800 truncate">
                {title}
              </h1>
              <p className="text-xs text-stone-500">
                {subtitle || (isLoading ? "En train de réfléchir..." : "Prêt à vous aider")}
              </p>
            </div>
          </div>
        </div>

        {/* Bouton historique mobile */}
        {showHistoryButton && isMobile && (
          <Link href="/ai/history">
            <Button variant="ghost" size="icon" className="hover:bg-stone-100">
              <History className="h-5 w-5 text-stone-700" />
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
});
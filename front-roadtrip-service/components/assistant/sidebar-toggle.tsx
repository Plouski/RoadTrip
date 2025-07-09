"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memo } from "react";

interface SidebarToggleProps {
  isOpen: boolean;
  onClick: () => void;
  isMobile: boolean;
}

export const SidebarToggle = memo(({ isOpen, onClick, isMobile }: SidebarToggleProps) => {
  if (!isOpen || isMobile) return null;

  return (
    <div className="absolute left-80 top-6 z-20 transform -translate-x-1/2 transition-all duration-300">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className="bg-white/90 backdrop-blur-sm h-8 w-8 rounded-full border border-stone-200 shadow-md hover:shadow-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
});
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

type AlertProps = {
  message: string;
  type: "success" | "error";
  className?: string;
  duration?: number;
};

export const AlertMessage: React.FC<AlertProps> = ({
  message,
  type,
  className,
  duration = 3000,
}) => {
  const [visible, setVisible] = useState(true);
  const isSuccess = type === "success";

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-full p-3 rounded-md text-sm border shadow-sm transition-opacity duration-500",
        isSuccess
          ? "bg-green-50 text-green-700 border-green-300"
          : "bg-red-50 text-red-700 border-red-300",
        className
      )}
    >
      <div className="mt-0.5">
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </div>
      <div className="flex-1">{message}</div>
    </div>
  );
};
import { cn } from "@/lib/utils"

type ParagraphProps = {
  children: React.ReactNode
  className?: string
  size?: "sm" | "base" | "lg"
  align?: "left" | "center" | "right"
}

const sizeClasses = {
  sm: "text-sm leading-relaxed",
  base: "text-base leading-relaxed",
  lg: "text-lg leading-relaxed"
}

export default function Paragraph({
  children,
  className = "",
  size = "base",
  align = "left"
}: ParagraphProps) {
  const alignment = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  }

  return (
    <p className={cn(sizeClasses[size], alignment[align], "text-gray-600", className)}>
      {children}
    </p>
  )
}
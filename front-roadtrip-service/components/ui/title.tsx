import { cn } from "@/lib/utils"
import { JSX } from "react"

type TitleProps = {
  level?: 1 | 2 | 3 | 4
  children: React.ReactNode
  className?: string
}

const baseStyles = {
  1: "text-3xl sm:text-4xl md:text-5xl font-bold",
  2: "text-2xl sm:text-3xl md:text-4xl font-bold",
  3: "text-xl sm:text-2xl md:text-3xl font-semibold",
  4: "text-lg sm:text-xl font-medium"
}

export default function Title({ level = 2, children, className = "" }: TitleProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return (
    <Tag className={cn(baseStyles[level], "text-gray-900", className)}>
      {children}
    </Tag>
  )
}
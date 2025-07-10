import { Loader2 } from "lucide-react"

interface LoadingProps {
  text?: string
}

export default function Loading({ text = "Chargement en cours..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500 animate-fade-in">
      <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-5" />
      <p className="text-sm sm:text-base md:text-lg">{text}</p>
    </div>
  )
}
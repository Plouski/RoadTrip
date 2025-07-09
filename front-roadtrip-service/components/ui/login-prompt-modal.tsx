import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function LoginPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()

  const goToAuth = () => {
    router.push("/auth")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connexion requise</DialogTitle>
        </DialogHeader>
        <p className="text-gray-600">Vous devez être connecté pour ajouter des roadtrips à vos favoris.</p>
        <DialogFooter>
          <Button onClick={goToAuth} className="w-full">Se connecter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  plan?: string
  nextPayment?: string
  amount?: string
}

export default function SuccessModal({ 
  isOpen, 
  onClose,
  plan = "Premium", 
  nextPayment = "19 mai 2025", 
  amount = "9,99€" 
}: SuccessModalProps) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-4 mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Félicitations !</h3>
          <p className="text-gray-600">
            Votre abonnement Premium a été activé avec succès. Profitez dès maintenant de toutes les fonctionnalités exclusives !
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Prochain paiement</span>
            <span className="font-medium">{nextPayment}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Montant</span>
            <span className="font-medium">{amount}</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button 
            className="w-full bg-primary hover:bg-primary-700 text-white rounded-xl py-5 h-auto text-base font-medium"
            onClick={() => {
              onClose();
              window.location.href = "/dashboard";
            }}
          >
            Aller au dashboard
          </Button>
          <Button 
            variant="outline" 
            className="w-full rounded-xl py-5 h-auto border-gray-300 hover:bg-gray-50 text-base font-medium"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}
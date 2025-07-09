'use client'

import { useState } from "react"

import { MapPin, Star, Download, Shield, Clock, Headphones } from "lucide-react"
import HeroSection from "@/components/premium/hero"
import FeaturesSection, { FeatureProps } from "@/components/premium/features"
import PricingSection from "@/components/premium/pricing"
import FaqSection from "@/components/premium/faq"
import SuccessModal from "@/components/premium/succes-modal"

const premiumFeatures: FeatureProps[] = [
  {
    icon: MapPin,
    title: "Itinéraires détaillés & exclusifs",
    description: "Accédez à notre collection complète d'itinéraires premium avec points d'intérêt cachés et recommandations locales.",
  },
  {
    icon: Star,
    title: "Assistant IA personnalisé",
    description: "Notre IA vous aide à planifier vos voyages selon vos préférences, budget et style de voyage.",
  },
  {
    icon: Download,
    title: "Cartes hors-ligne illimitées",
    description: "Téléchargez tous vos itinéraires et cartes pour y accéder même sans connexion internet.",
  },
]

const faqs = [
  {
    question: "Comment fonctionne l'abonnement Premium ?",
    answer: "L'abonnement ROADTRIP! Premium vous donne accès à toutes les fonctionnalités exclusives de notre plateforme. Vous pouvez choisir entre un abonnement mensuel ou annuel, ce dernier vous permettant d'économiser 25%. Une fois abonné, vous aurez immédiatement accès à tous les itinéraires premium, l'assistant IA, les cartes hors-ligne et toutes les autres fonctionnalités exclusives."
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer: "Oui, vous pouvez annuler votre abonnement à tout moment. Si vous annulez un abonnement mensuel, vous continuerez à avoir accès aux fonctionnalités premium jusqu'à la fin de la période de facturation en cours. Pour les abonnements annuels, vous conserverez l'accès jusqu'à la fin de l'année d'abonnement. Aucun remboursement partiel n'est prévu pour les annulations en milieu de période."
  },
  {
    question: "Quelles sont les différences entre la version gratuite et premium ?",
    answer: "La version gratuite vous permet d'accéder aux itinéraires de base, à la recherche de destinations et à la sauvegarde de favoris. La version premium débloque l'ensemble des fonctionnalités : itinéraires détaillés exclusifs, assistant IA personnalisé, cartes hors-ligne illimitées, recommandations d'hébergements exclusifs, accès prioritaire aux nouveautés et support client dédié 24/7."
  },
  {
    question: "L'assistant IA est-il vraiment personnalisé ?",
    answer: "Absolument ! Notre assistant IA analyse vos préférences de voyage, votre budget, vos centres d'intérêt et même la durée souhaitée pour créer des itinéraires sur mesure. Il peut également adapter des itinéraires existants à vos besoins spécifiques et vous suggérer des alternatives en fonction de la météo ou d'autres facteurs."
  }
]

export default function PremiumPage() {
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection features={premiumFeatures} />
      <PricingSection
        features={premiumFeatures.map(feature => ({ title: feature.title }))} 
        onSubscribe={() => setShowSuccessModal(true)} 
      />
      <FaqSection faqs={faqs} />      
      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
      />
    </div>
  )
}
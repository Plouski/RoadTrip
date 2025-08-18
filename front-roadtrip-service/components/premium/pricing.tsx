'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubscriptionService } from "@/services/subscription-service"
import { AuthService } from "@/services/auth-service"
import { useRouter } from "next/navigation"
import Title from "../ui/title"
import Paragraph from "../ui/paragraph"
import FreePlanCard from "./free-plan-card"
import PremiumPlanCard from "./premium-plan-card"

interface PricingFeature {
  title: string
}

export default function PricingSection({ features, onSubscribe }: { features: PricingFeature[], onSubscribe: () => void }) {
  const router = useRouter()

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    const token = AuthService.getAuthToken()
    if (!token) {
      router.push("/auth")
      return
    }

    try {
      const url = await SubscriptionService.startCheckoutSession(plan)
      if (url) {
        window.location.href = url
      } else {
        onSubscribe()
      }
    } catch (error) {
      onSubscribe()
    }
  }

  return (
    <section id="pricing" className="py-16 sm:py-20 lg:py-24 bg-white relative overflow-hidden">  
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
        {/* Header responsive */}
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <Title level={2} className="mb-3 sm:mb-4">
            Choisissez votre formule
          </Title>
          <Paragraph 
            align="center" 
            className="px-4 sm:px-0"
          >
            Flexible et adaptée à vos besoins, notre tarification vous permet de profiter d'une expérience premium qui vous correspond.
          </Paragraph>
        </div>

        <Tabs defaultValue="monthly" className="max-w-5xl mx-auto">
          {/* Tabs navigation responsive */}
          <div className="flex justify-center mb-8 sm:mb-10 px-4 sm:px-0">
            <TabsList className="p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
              <TabsTrigger 
                value="monthly" 
              >
                Mensuel
              </TabsTrigger>
              <TabsTrigger 
                value="annual" 
              >
                Annuel 
                <span className="ml-1 sm:ml-2 bg-green-100 text-green-700 text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                  -25%
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Monthly plans */}
          <TabsContent value="monthly" className="px-4 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <FreePlanCard />
              <PremiumPlanCard
                type="monthly"
                price="5€"
                period="par mois, sans engagement"
                features={features}
                onSubscribe={() => handleSubscribe("monthly")}
              />
            </div>
          </TabsContent>

          {/* Annual plans */}
          <TabsContent value="annual" className="px-4 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <FreePlanCard />
              <PremiumPlanCard
                type="annual"
                price="45€"
                period="par an"
                regularPrice="60€"
                savings="Économisez 25%"
                features={features}
                onSubscribe={() => handleSubscribe("annual")}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
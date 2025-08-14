"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertMessage } from "@/components/ui/alert-message";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Clock,
  MessageCircle,
  Bug,
  Info,
  Heart,
  Star,
} from "lucide-react";
import { ContactService } from "@/services/contact-service";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const categories = [
    {
      id: "problem",
      label: "Problème technique",
      icon: Bug,
      color: "bg-red-100 text-red-800",
    },
    {
      id: "info",
      label: "Demande d'information",
      icon: Info,
      color: "bg-blue-100 text-blue-800",
    },
    {
      id: "suggestion",
      label: "Suggestion d'amélioration",
      icon: Star,
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      id: "feedback",
      label: "Retour d'expérience",
      icon: Heart,
      color: "bg-green-100 text-green-800",
    },
    {
      id: "other",
      label: "Autre",
      icon: MessageCircle,
      color: "bg-gray-100 text-gray-800",
    },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlertMessage("");
    setAlertType(null);

    try {
      // Validation côté client
      const validation = ContactService.validateContactForm(formData);
      if (!validation.isValid) {
        setAlertMessage(validation.errors.join(", "));
        setAlertType("error");
        setIsLoading(false);
        return;
      }

      // Envoi du message
      const result = await ContactService.sendContactMessage(formData);

      if (result.success) {
        setAlertMessage(result.message);
        setAlertType("success");
        setIsSubmitted(true);

        // Reset du formulaire
        setFormData({
          name: "",
          email: "",
          subject: "",
          category: "",
          message: "",
        });

        // Scroll vers le haut pour voir le message de succès
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setAlertMessage(result.message);
        setAlertType("error");
      }
    } catch (error) {
      setAlertMessage(
        "Une erreur inattendue est survenue. Veuillez réessayer."
      );
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container py-12 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contactez-nous
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Une question ? Un problème ? Nous sommes là pour vous aider !
            N'hésitez pas à nous contacter, notre équipe vous répondra
            rapidement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Formulaire de contact */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Envoyez-nous un message</CardTitle>
                <CardDescription>
                  Remplissez le formulaire ci-dessous et nous vous répondrons
                  rapidement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertMessage && (
                  <div className="mb-6">
                    <AlertMessage message={alertMessage} type={alertType} />
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nom et Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom complet *
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="votre@email.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Catégorie de votre demande
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() =>
                              handleInputChange("category", category.id)
                            }
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              formData.category === category.id
                                ? "border-primary bg-primary/5"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {category.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sujet */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sujet *
                    </label>
                    <Input
                      type="text"
                      value={formData.subject}
                      onChange={(e) =>
                        handleInputChange("subject", e.target.value)
                      }
                      placeholder="Résumé de votre demande"
                      required
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) =>
                        handleInputChange("message", e.target.value)
                      }
                      placeholder="Décrivez votre demande en détail..."
                      rows={6}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 10 caractères ({formData.message.length}/10)
                    </p>
                  </div>

                  {/* Bouton d'envoi */}
                  <Button
                    type="submit"
                    disabled={isLoading || formData.message.length < 10}
                    className="w-full bg-gradient-to-r from-primary to-primary-700 hover:opacity-90"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Envoi en cours...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Envoyer le message
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ rapide */}
        <div className="mt-16">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Questions fréquentes</CardTitle>
              <CardDescription>
                Peut-être trouverez-vous votre réponse ici !
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Comment réinitialiser mon mot de passe ?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Cliquez sur "Mot de passe oublié" sur la page de connexion
                    et suivez les instructions.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Comment devenir Premium ?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Rendez-vous sur la page Premium depuis votre compte pour
                    découvrir nos offres.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Mes roadtrips sont-ils privés ?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Vos roadtrips sont privés par défaut. Vous pouvez choisir de
                    les partager publiquement.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    L'IA fonctionne-t-elle hors ligne ?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Non, l'assistant IA nécessite une connexion internet pour
                    fonctionner correctement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

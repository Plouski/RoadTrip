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
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

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
    <div className="relative min-h-screen overflow-hidden">
      <div className="container py-14 px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Title level={1} className="mb-3">
            Contactez-nous
          </Title>
          <Paragraph size="sm" align="center">
            Une question ? Un souci ? RoadTrip! est là pour vous aider.{" "}
          </Paragraph>
        </div>

        <Card className="mx-auto max-w-3xl border border-gray-200/70 shadow-xl shadow-gray-900/[0.03]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Envoyez-nous un message</CardTitle>
            <CardDescription>
              Remplissez le formulaire ci-dessous et nous vous répondrons
              rapidement.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {alertMessage && (
              <div className="mb-6">
                <AlertMessage message={alertMessage} type={alertType} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Nom et Email */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Nom complet *
                  </label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Votre nom"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email *
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
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
              </div>

              {/* Catégorie */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Catégorie de votre demande
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const active = formData.category === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          handleInputChange("category", category.id)
                        }
                        className={[
                          "group relative rounded-xl border-2 p-3 text-left transition-all",
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={[
                              "h-4 w-4 transition-colors",
                              active
                                ? "text-primary"
                                : "text-gray-500 group-hover:text-gray-700",
                            ].join(" ")}
                          />
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
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Sujet *
                </label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Résumé de votre demande"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Message *
                </label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Décrivez votre demande en détail..."
                  rows={7}
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Minimum 10 caractères</span>
                  <span>{formData.message.length}/10</span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        (formData.message.length / 10) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Bouton d'envoi */}
              <Button
                type="submit"
                disabled={isLoading || formData.message.length < 10}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Envoi en cours...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Envoyer le message
                  </div>
                )}
              </Button>

              {/* note RGPD / support */}
              <p className="text-center text-xs text-gray-500">
                En envoyant ce formulaire, vous acceptez que nous utilisions vos
                informations pour vous répondre.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

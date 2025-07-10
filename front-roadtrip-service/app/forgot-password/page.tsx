"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lock, Mail, MessageSquare } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import Loading from "@/components/ui/loading";

export default function PasswordRecoveryPage() {
  const router = useRouter();

  // État pour gérer l'étape du formulaire : "request" (demande) ou "reset" (réinitialisation)
  const [step, setStep] = useState<"request" | "reset">("request");

  // État pour choisir la méthode d'envoi du code : email ou SMS
  const [method, setMethod] = useState<"email" | "sms">("email");

  // Champs de formulaire
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Gestion du chargement et des alertes utilisateur
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);

  // Affiche une alerte (succès ou erreur) - même fonction que dans AuthPage
  const showAlert = (message: string, type: "success" | "error") => {
    setAlertMessage(null);
    setAlertType(null);
    setTimeout(() => {
      setAlertMessage(message);
      setAlertType(type);
    }, 10);
  };

  /**
   * Étape 1 : Envoi de la demande de réinitialisation
   * - Envoie un code de vérification par email ou SMS
   */
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (method === "email") {
        await AuthService.initiatePasswordReset(email);
      } else {
        await AuthService.initiatePasswordResetBySMS(phone);
      }
      showAlert("Un code vous a été envoyé. Vérifiez vos messages.", "success");
      setStep("reset");
    } catch (error: any) {
      showAlert(error.message || "Erreur lors de la demande.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Étape 2 : Soumission du code et du nouveau mot de passe
   */
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérification des champs obligatoires
    if (!email || !resetCode || !newPassword || !confirmPassword) {
      showAlert("Tous les champs sont requis.", "error");
      return;
    }

    // Vérification de la correspondance des mots de passe
    if (newPassword !== confirmPassword) {
      showAlert("Les mots de passe ne correspondent pas.", "error");
      return;
    }

    // Regex EXACTEMENT identique à celle de AuthPage qui fonctionne
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!strongPasswordRegex.test(newPassword)) {
      showAlert(
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    showAlert("Réinitialisation en cours...", "success");

    try {
      await AuthService.resetPassword(email, resetCode, newPassword);
      showAlert("Mot de passe réinitialisé avec succès.", "success");

      // Redirection vers la page d'authentification après quelques secondes
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    } catch (error: any) {
      showAlert(error.message || "Erreur lors de la réinitialisation.", "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>
              {step === "request" ? "Mot de passe oublié" : "Réinitialisation"}
            </CardTitle>
            <CardDescription>
              {step === "request"
                ? "Recevez un code par email ou SMS"
                : "Saisissez le code reçu et votre nouveau mot de passe"}
            </CardDescription>
          </CardHeader>

          {/* Formulaire : étape 1 (request) ou 2 (reset) */}
          <form onSubmit={step === "request" ? handleRequest : handleReset}>
            <CardContent className="space-y-4">
              {/* Étape 1 : choix de la méthode et saisie email / téléphone */}
              {step === "request" && (
                <>
                  <RadioGroup value={method} onValueChange={setMethod}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="radio-email" />
                      <Label htmlFor="radio-email" className="flex items-center cursor-pointer">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sms" id="radio-sms" />
                      <Label htmlFor="radio-sms" className="flex items-center cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        SMS
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Champ email ou téléphone selon la méthode choisie */}
                  {method === "email" ? (
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Numéro de téléphone</Label>
                      <Input
                        type="tel"
                        placeholder="+33612345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* Étape 2 : saisie du code et nouveau mot de passe */}
              {step === "reset" && (
                <>
                  {/* Email visible seulement pour la méthode SMS */}
                  {method === "sms" && (
                    <div className="space-y-2">
                      <Label>Email associé</Label>
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Affichage de l'email (lecture seule) si méthode = email */}
                  {method === "email" && (
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={email} readOnly />
                    </div>
                  )}

                  {/* Saisie du code reçu */}
                  <div className="space-y-2">
                    <Label>Code de réinitialisation</Label>
                    <Input
                      type="text"
                      value={resetCode}
                      placeholder="Votre code de réinitialisation reçu"
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                  </div>

                  {/* Saisie du nouveau mot de passe - EXACTEMENT comme dans AuthPage */}
                  <div className="space-y-2">
                    <Label htmlFor="password-register">Nouveau mot de passe</Label>
                    <Input
                      id="password-register"
                      type="password"
                      value={newPassword}
                      placeholder="Votre mot de passe"
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      title="Mot de passe : 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial."
                    />
                  </div>

                  {/* Confirmation du mot de passe */}
                  <div className="space-y-2">
                    <Label htmlFor="password-confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="password-confirm"
                      type="password"
                      value={confirmPassword}
                      placeholder="Confirmation du mot de passe"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </CardContent>

            {/* Bouton de soumission + message d'alerte */}
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  step === "request" ? "Envoi..." : "Réinitialisation..."
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {step === "request" ? "Envoyer" : "Réinitialiser"}
                  </>
                )}
              </Button>

              {/* Affichage du message de succès ou d'erreur */}
              {alertMessage && (
                <AlertMessage message={alertMessage} type={alertType!} />
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
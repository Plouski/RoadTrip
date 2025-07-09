"use client";

import React, { useState, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Facebook, Github } from "lucide-react";
import { AuthService } from "@/services/auth-service";
import { AlertMessage } from "@/components/ui/alert-message";

export default function AuthPage(): JSX.Element {
  const router = useRouter();

  // États des formulaires
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Vérifie si l'utilisateur est déjà authentifié à l'ouverture de la page
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await AuthService.checkAuthentication();
      if (isAuthenticated) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const provider = params.get("provider");

    if (error) {
      let message = "Une erreur inconnue est survenue.";

      if (error === "csrf_failed") {
        message = `Échec de sécurité CSRF avec ${provider}. Veuillez réessayer.`;
      } else if (error === "session_invalid") {
        message = `Session invalide avec ${provider}. Veuillez recommencer.`;
      } else if (error === "oauth_failed") {
        message = `La connexion via ${provider} a échoué.`;
      }

      setAlertMessage(message);
      setAlertType("error");
    }
  }, []);

  // Gestion du formulaire de connexion
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    showAlert("Connexion en cours...", "success");

    try {
      await AuthService.login(email, password);
      showAlert("Connexion réussie !", "success");

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error: any) {
      showAlert(error.message || "Une erreur s'est produite.", "error");
      setIsLoading(false);
    }
  };

  // Gestion du formulaire d'inscription
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Vérifie que les deux mots de passe correspondent
    if (password !== passwordConfirm) {
      showAlert("Les mots de passe ne correspondent pas.", "error");
      return;
    }

    // Regex pour mot de passe fort
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!strongPasswordRegex.test(password)) {
      showAlert(
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    showAlert("Création du compte en cours...", "success");

    try {
      await AuthService.register(email, password, firstName, lastName);
      showAlert("Inscription réussie ! Vérifiez votre e-mail.", "success");

      // Réinitialise les champs après inscription
      setTimeout(() => {
        setIsLoading(false);
        setActiveTab("login");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setPasswordConfirm("");
      }, 1000);
    } catch (error: any) {
      setAlertMessage(error.message || "Erreur pendant l'inscription.");
      setAlertType("error");
      setIsLoading(false);
    }
  };

  // Connexion avec fournisseur OAuth
  const handleSocialLogin = async (provider: string) => {
    try {
      setIsLoading(true);
      showAlert(`Redirection vers ${provider}...`, "success");

      setTimeout(() => {
        AuthService.socialLogin(provider);
      }, 500);
    } catch (error: any) {
      setIsLoading(false);
      showAlert(`Erreur avec ${provider}: ${error.message}`, "error");
    }
  };

  // Affiche un message d’alerte temporaire
  const showAlert = (message: string, type: "success" | "error") => {
    setAlertMessage(null);
    setAlertType(null);
    setTimeout(() => {
      setAlertMessage(message);
      setAlertType(type);
    }, 10);
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <div className="w-full max-w-md">
        {/* Onglets Connexion / Inscription */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Inscription</TabsTrigger>
          </TabsList>

          {/* Formulaire de Connexion */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Connexion</CardTitle>
                <CardDescription>
                  Connectez-vous pour accéder à vos itinéraires.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {/* Champ email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Champ mot de passe */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="password">Mot de passe</Label>
                      <a
                        href="/forgot-password"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push("/forgot-password");
                        }}
                      >
                        Mot de passe oublié ?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  {/* Bouton Connexion */}
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </Button>

                  {/* Message d'alerte */}
                  {alertMessage && (
                    <AlertMessage message={alertMessage} type={alertType!} />
                  )}

                  {/* Lignes de séparation et boutons sociaux */}
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Ou continuer avec
                      </span>
                    </div>
                  </div>

                  {/* Boutons de connexion sociale */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleSocialLogin("facebook")}
                    >
                      <Facebook className="mr-2 h-4 w-4" />
                      Fb
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleSocialLogin("google")}
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 488 512"
                        fill="currentColor"
                      >
                        <path d="M488 261.8c0-17.8-1.5-35-4.3-51.8H249v98h135.7c-5.8 31.4-23.3 58-49.6 75.8v62.7h80.4c47.2-43.5 74.5-107.7 74.5-184.7z" />
                        <path d="M249 492c67 0 123.1-22.1 164.2-60l-80.4-62.7c-22.3 15-51 24-83.8 24-64.4 0-119-43.5-138.5-102.1H29v64.4C70.3 444.1 152.6 492 249 492z" />
                        <path d="M110.5 298.2c-6.5-19.3-10.2-39.9-10.2-61s3.7-41.7 10.2-61V111.8H29C10.6 151.6 0 198 0 247.2s10.6 95.6 29 135.4l81.5-64.4z" />
                        <path d="M249 97.5c35.5 0 67.4 12.3 92.6 36.5l69.3-69.3C370.3 27.4 314.3 0 249 0 152.6 0 70.3 47.9 29 119.6l81.5 64.4C130 141 184.6 97.5 249 97.5z" />
                      </svg>
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleSocialLogin("github")}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Formulaire d'inscription */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Créer un compte</CardTitle>
                <CardDescription>
                  Rejoignez RoadTrip! et découvrez des expériences uniques.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {/* Nom et prénom */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        placeholder="Votre prénom"
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        placeholder="Votre nom"
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email-register">Email</Label>
                    <Input
                      id="email-register"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Mot de passe */}
                  <div className="space-y-2">
                    <Label htmlFor="password-register">Mot de passe</Label>
                    <Input
                      id="password-register"
                      type="password"
                      value={password}
                      placeholder="Votre mot de passe"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      title="Mot de passe : 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial."
                    />
                  </div>

                  {/* Confirmation mot de passe */}
                  <div className="space-y-2">
                    <Label htmlFor="password-confirm">
                      Confirmer le mot de passe
                    </Label>
                    <Input
                      id="password-confirm"
                      type="password"
                      value={passwordConfirm}
                      placeholder="Confirmation du mot de passe"
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>

                  {/* Conditions d'utilisation */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="terms"
                      className="rounded border-gray-300"
                      required
                    />
                    <Label htmlFor="terms" className="text-sm font-normal">
                      J'accepte les{" "}
                      <a href="#" className="text-primary hover:underline">
                        conditions d'utilisation
                      </a>{" "}
                      et la{" "}
                      <a href="#" className="text-primary hover:underline">
                        politique de confidentialité
                      </a>
                      .
                    </Label>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Création en cours..." : "Créer un compte"}
                  </Button>
                  {alertMessage && (
                    <AlertMessage message={alertMessage} type={alertType!} />
                  )}
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

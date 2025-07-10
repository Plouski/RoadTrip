"use client";

import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";

export default function PushManager({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (typeof window === "undefined" || !userId || !isMounted) return;

      setStatus("loading");

      try {
        // Étape 1: Initialiser Firebase
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
          authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
        };

        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // Étape 2: Enregistrer le service worker
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          } catch (swError) {
            console.error("❌ Erreur d'enregistrement du service worker:", swError);
            throw new Error(`Erreur SW: ${swError instanceof Error ? swError.message : String(swError)}`);
          }
        }

        // Étape 3: Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("⚠️ Permission de notification refusée");
          setStatus("error");
          return;
        }

        // Étape 4: Obtenir le token
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
        });

        if (!token) {
          console.error("❌ Impossible d'obtenir le token FCM!");
          setStatus("error");
          return;
        }

        // Empêche un enregistrement multiple
        const lastToken = localStorage.getItem("pushToken");
        if (lastToken === token) {
          console.log("🔁 Token déjà enregistré, on ne renvoie pas au serveur");
        } else {
          // Étape 5: Envoyer au serveur
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL}/api/notifications/push/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY!,
              },
              body: JSON.stringify({ userId, token }),
            }
          );

          const data = await response.json();

          if (response.ok) {
            console.log("✅ Token enregistré avec succès:", data.message);
            localStorage.setItem("pushToken", token); // Mémorise le token
          } else {
            console.error("❌ Erreur d'enregistrement du token:", data.message);
            setStatus("error");
            return;
          }
        }

        // Étape 6: Réception de messages
        onMessage(messaging, (payload) => {
          const notificationTitle = payload?.notification?.title || payload?.data?.title || "ROADTRIP!";
          const notificationBody = payload?.notification?.body || payload?.data?.body || "";
          const notificationOptions = {
            body: notificationBody,
            icon: "/favicon.ico"
          };

          try {
            new Notification(notificationTitle, notificationOptions);
          } catch (err) {
            console.error("❌ Erreur d'affichage notification:", err);
          }
        });

        setStatus("success");

      } catch (error) {
        console.error("❌ Erreur globale PushManager:", error);
        setStatus("error");
      }
    };

    init();

    return () => {
      isMounted = false;
      console.log("🔴 PushManager démonté");
    };
  }, [userId]);

  return null;
}

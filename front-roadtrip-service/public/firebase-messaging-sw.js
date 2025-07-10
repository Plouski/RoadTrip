// Version améliorée du service worker Firebase
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Configuration Firebase - À remplacer par vos propres valeurs
firebase.initializeApp({
  apiKey:  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

console.log('🔔 Service Worker Firebase initialisé - Version améliorée');

const messaging = firebase.messaging();

// Log tous les messages reçus en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('📬 [firebase-messaging-sw.js] Message reçu en arrière-plan:', payload);
  
  // Extraire les données de notification, avec fallbacks pour différentes structures
  const notificationTitle = 
    payload.notification?.title || 
    payload.data?.title || 
    'ROADTRIP!';
    
  const notificationBody = 
    payload.notification?.body || 
    payload.data?.body || 
    '';
    
  const notificationIcon = '/logo192.png';
  
  // Options de notification optimisées
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/favicon.ico',
    data: payload.data || {},
    timestamp: new Date().getTime(),
    requireInteraction: true,
    vibrate: [200, 100, 200], // Vibration pattern pour mobile
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      }
    ],
    // S'assurer que les données importantes sont copiées pour l'événement click
    payload: JSON.stringify(payload)
  };
  
  console.log('🔔 [firebase-messaging-sw.js] Affichage notification:', {
    title: notificationTitle,
    options: notificationOptions
  });
  
  // Afficher la notification
  try {
    self.registration.showNotification(notificationTitle, notificationOptions);
    console.log('✅ [firebase-messaging-sw.js] Notification affichée avec succès');
  } catch (error) {
    console.error('❌ [firebase-messaging-sw.js] Erreur lors de l\'affichage de la notification:', error);
  }
});

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ [firebase-messaging-sw.js] Notification cliquée:', event);
  
  // Fermer la notification
  event.notification.close();
  
  // Déterminer l'URL à ouvrir
  const url = event.notification.data?.url || self.location.origin;
  
  console.log('🔗 [firebase-messaging-sw.js] URL cible:', url);
  
  // Ouvrir ou concentrer l'onglet existant
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Vérifier si une fenêtre/onglet est déjà ouvert avec l'URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          console.log('👁️ [firebase-messaging-sw.js] Focus sur onglet existant:', client.url);
          return client.focus();
        }
      }
      
      // Si aucun onglet n'est ouvert, en ouvrir un nouveau
      if (clients.openWindow) {
        console.log('🔗 [firebase-messaging-sw.js] Ouverture nouvelle fenêtre:', url);
        return clients.openWindow(url);
      }
    })
  );
});

// Événement d'installation du service worker
self.addEventListener('install', (event) => {
  console.log('🔧 [firebase-messaging-sw.js] Installation du service worker');
  self.skipWaiting(); // Force l'activation immédiate
});

// Événement d'activation du service worker
self.addEventListener('activate', (event) => {
  console.log('✅ [firebase-messaging-sw.js] Service worker activé');
  
  // Prendre le contrôle de tous les clients non contrôlés immédiatement
  event.waitUntil(clients.claim());
});
# 🌍 Front RoadTrip! — Next.js App

> **Front-end du RoadTrip!**  
> _Consomme les microservices: auth-service, data-service, ai-service, paiement-service, notification-service._

---

## ✨ Fonctionnalités

- Authentification (OAuth Google/Facebook via auth-service)
- Navigation App Router (Next 13+) + layouts
- Pages publiques: accueil, explorer, contact, roadtrips
- Pages protégées: favoris, profil
- Espace Premium (accès IA + contenus premium)
- Espace Admin (stats & gestion)
- Intégration AI (conseiller d’itinéraires)
- UI moderne: Tailwind + shadcn/ui
- Tests (Jest + Testing Library) & mocks

---

## 🚀 Démarrage rapide

```bash
# 1) Installer
npm install

# 2) Copier les variables d'env
cp .env.example .env

# 3) Lancer en dev
npm run dev

# 4) Build + start (prod)
npm run build && npm start

# 5) Tests
npm test
```

---

### Variables d'environnement

```env
# URL publique de l'app
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Microservices
NEXT_PUBLIC_AUTH_URL=http://localhost:5001
NEXT_PUBLIC_DATA_URL=http://localhost:5002
NEXT_PUBLIC_AI_URL=http://localhost:5003
NEXT_PUBLIC_PAYMENT_URL=http://localhost:5004
NEXT_PUBLIC_NOTIFICATION_URL=http://localhost:5005

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

NEXT_PUBLIC_NOTIFICATION_API_KEY=roadTripNotifySecret
```

---

## 📁 Structure du projet (extrait)

```
front-roadtrip-service/
├── app/                       # App Router (pages et layouts)
│   ├── admin/                 # Espace admin (stats, gestion)
│   ├── ai/                    # Assistant IA (requêtes + historique)
│   ├── auth/                  # Pages d'auth / redirections
│   ├── confirm-account/       # Confirmation e-mail
│   ├── contact/               # Formulaire de contact
│   ├── explorer/              # Parcourir les roadtrips publics
│   ├── favorites/             # Favoris (protégé)
│   ├── forgot-password/       # Mot de passe oublié
│   ├── oauth-callback/        # Callback OAuth (depuis auth-service)
│   ├── premium/               # Hub premium (contenus payants)
│   ├── profile/               # Profil utilisateur (protégé)
│   ├── roadtrip/              # Détails roadtrip (/:id)
│   ├── globals.css            # Styles globaux Tailwind
│   ├── layout.tsx             # Layout racine + Providers
│   ├── loading.tsx            # Loader global (Suspense)
│   └── page.tsx               # Homepage
├── components/                # UI réutilisable
├── hooks/                     # Hooks custom
├── lib/                       # Utilitaires
├── services/                  # Clients API vers les microservices
├── types/                     # Types/DTO
├── public/                    # Assets statiques
├── __tests__/                 # Tests
├── tailwind.config.ts         # Config Tailwind
├── components.json            # Config shadcn/ui
├── next.config.mjs            # Config Next.js
├── jest.setup.js              # Setup Jest/RTL
└── tsconfig.json              # TS config
```

---

### 🧠 Pages & parcours (App Router)

- / — Accueil

- /explorer — Liste des roadtrips publics (filtres: pays, premium…)
- /roadtrip/[id] — Détail roadtrip (aperçu réduit si non premium)
- /favorites — Mes favoris (auth requis)
- /profile — Profil & MAJ des infos (auth requis)
- /ai — Assistant IA (premium/admin requis)
- /premium — Présentation/offres premium
- /contact — Formulaire de contact (envoie via notification-service)
- /forgot-password — Réinitialisation mot de passe (data-service + notif)
- /confirm-account — Validation de compte (lien email)
- /auth — Pages d’entrée auth (login/register)
- /oauth-callback — Réception token depuis auth-service
- /admin — Dashboard admin (stats, users, trips)

Les routes protégées vérifient la présence du token (via hooks/useAuth et services/auth).

---

## 🔌 Services API consommés

Les clients sont centralisés dans services/ (exemples) :

**services/data**
- GET ${DATA_URL}/api/roadtrips?country=...&isPremium=...&page=...&limit=...
- GET ${DATA_URL}/api/roadtrips/popular?limit=3
- GET ${DATA_URL}/api/roadtrips/:id
- POST ${DATA_URL}/api/roadtrips/:id/views
- POST ${DATA_URL}/api/favorites/toggle/:tripId
- GET ${DATA_URL}/api/favorites

**services/ai**
- POST ${AI_URL}/ask (auth + premium/admin) — génération itinéraire
- POST ${AI_URL}/save (auth + premium/admin)
- GET ${AI_URL}/history (auth + premium/admin)
- GET ${AI_URL}/conversation/:id (auth + premium/admin)
- DELETE ${AI_URL}/conversation/:id (auth + premium/admin)

**services/auth**
- OAuth via auth-service (flow externe), réception sur /oauth-callback

**services/notification**
- POST ${NOTIFICATION_URL}/api/contact/send (x-api-key en header)

Tous les appels ajoutent Authorization: Bearer <token> si l’utilisateur est connecté.

---

## 🎨 UI & design

- TailwindCSS + shadcn/ui pour une UI moderne
- Components communs (components/…) : Header, Footer, TripCard, etc.
- Animations légères & focus states accessibles

---

## 🔐 Auth & sécurité (front)

- Tokens JWT stockés côté client (selon ton implémentation: cookie httpOnly côté backend recommandé)
- Garde de routes via hooks (useAuth) + redirection vers /auth si nécessaire
- Rôles pris en charge: user, premium, admin (différenciation affichage et accès)

---

## 🧪 Tests

```bash
npm test
```

- jest.setup.js : configuration Testing Library / MSW (si utilisé)
- Tests unitaires de composants + tests d’intégration de pages
- Mocks d’API dans __mocks__/

---

## 🧰 Scripts utiles (package.json)

- dev — lance Next en mode dev
- build — build production
- start — démarre le serveur Next en prod
- lint — ESLint
- test — Jest

## 🐳 Déploiement

- Vercel (recommandé) : définir toutes les variables NEXT_PUBLIC_*

- Docker (optionnel) : exposer le port 3000 et injecter .env

- Assurez-vous que les microservices sont accessibles depuis l’URL publique

---

## 🐛 Troubleshooting

| Problème                  | Cause probable             | Solution                                                 |
| ------------------------- | -------------------------- | -------------------------------------------------------- |
| 401 sur endpoints         | Token manquant/expiré      | Vérifier stockage/refresh token + header `Authorization` |
| IA indisponible           | Rôle insuffisant / AI down | Vérifier rôle `premium`/`admin` et `NEXT_PUBLIC_AI_URL`  |
| Contact échoue            | `x-api-key` absent         | Config côté backend (notification-service)               |
| Images/Assets non chargés | Config Next images         | Ajuster `next.config.mjs` (domains/remotePatterns)       |

---

## 👥 Contexte Projet

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel 
**Auteur** : Inès GERVAIS
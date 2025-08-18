# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.  
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)  
Versioning : [Semantic Versioning](https://semver.org/lang/fr/).

---

## [1.0.3]
### ✅ Fixed
- **data-service**
  - Correction du mapping `userId` (UUID → ObjectId) lors du traitement des paiements Stripe.
  - Ajout de tests automatisés dans le pipeline CI.
- **Résultat :** l’upgrade vers Premium est bien appliqué après paiement.

---

## [1.0.2]
### ✅ Fixed
- **notification-service**
  - Correction de la configuration Mailjet (mauvaises clés API).
  - Refonte des templates d’email cassés.
- **Résultat :** 98% des emails de confirmation sont délivrés correctement.

---

## [1.0.1]
### ✅ Fixed
- **auth-service**
  - Bug OAuth : le `userId` n’était pas toujours récupéré lors des connexions Google.
  - Ajout d’un fallback (`user.id || user._id`) et gestion d’erreur explicite.
- **Résultat :** plus aucune erreur OAuth détectée dans les logs Winston.

---

## [1.0.0]
### 🚀 Added
- **Déploiement initial** de l’architecture microservices :
  - `auth-service`, `data-service`, `ai-service`, `notification-service`,  
    `paiement-service`, `frontend`, `metrics-service`.
- **Stack monitoring** : Loki, Prometheus, Grafana opérationnels.
- **CI/CD** : Pipeline GitHub Actions avec tests automatisés.
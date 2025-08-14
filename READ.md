pour le filtrage : ajouter debounce
pour les metrics : surveiller l'etat de santé et le temps de réponse pas requettes de HTTPS

stripe listen --forward-to localhost:5004/webhook


Auth Service :
Notification Service : ok
AI Service :
Paiement Service : ok
Data Service :
Metric Service :
Front Service :

a faire avant de finaliser le projet :
Vérifier que ton code est à jour
bash
Copier
Modifier
git status
S’il y a des fichiers modifiés, committe-les :

bash
Copier
Modifier
git add .
git commit -m "Version finale pour jury"
3️⃣ Créer un tag annoté (meilleur pour la description)
bash
Copier
Modifier
git tag -a version-jury-2025 -m "Version finale du projet RoadTrip! pour présentation au jury RNCP"
4️⃣ Envoyer le tag sur GitHub
bash
Copier
Modifier
git push origin version-jury-2025
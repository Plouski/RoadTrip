pour le filtrage : ajouter debounce
pour les metrics : surveiller l'etat de santé et le temps de réponse pas requettes de HTTPS

stripe listen --forward-to localhost:5004/webhook


Auth Service : ok (sauf readme)
Notification Service : ok
AI Service : ok (sauf readme)
Paiement Service : ok 
Data Service :
Metric Service : ok (sauf readme)
Front Service :

améliorer les favoris

améliorer les budgets

créer une page de contact

empecher d'aller dans accueil quand on est authentifier

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
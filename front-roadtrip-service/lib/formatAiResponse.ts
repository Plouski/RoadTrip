// front-roadtrip-service/lib/formatAiResponse.ts
export function formatAiResponse(response: any): string {
  if (!response) return "❌ Aucune réponse reçue. Veuillez réessayer.";

  if (typeof response === "string") {
    try { response = JSON.parse(response); } catch { return response; }
  }
  if (typeof response !== "object") return "❌ Format de réponse invalide. Veuillez réessayer.";

  if (response.type === "error") {
    return `❌ **Erreur** : ${response.message || "Une erreur s'est produite."}\n\nVeuillez reformuler votre demande.`;
  }

  let message = "";

  if (response.type === "roadtrip_itinerary") {
    // --- Budget total ---
    let total = response?.budget_estime?.total || response?.budget_estime?.montant || null;
    if (!total) {
      const det = response?.budget_estime || {};
      const parts = [det.transport, det.hebergement, det.nourriture, det.activites].filter(Boolean);
      const sum = parts.map(toNumber).reduce((a, b) => a + b, 0);
      if (sum > 0) total = toEuro(sum);
    }

    // --- En-tête ---
    message += `\n✨ **ROADTRIP : ${(response.destination || "Destination inconnue").toUpperCase()}**\n`;
    message += `🗓️ Durée recommandée : **${response.duree_recommandee || "X jours"}**\n`;
    message += `📅 Saison idéale : **${response.saison_ideale || "Inconnue"}**\n`;
    message += `💰 Budget estimé : **${total || "À définir"}**\n\n`;

    // --- Répartition du budget ---
    const be = response.budget_estime || {};
    if (be.transport || be.hebergement || be.nourriture || be.activites) {
      message += `📊 **Répartition du budget :**\n`;
      if (be.transport) message += `   🚌 Transport : ${be.transport}\n`;
      if (be.hebergement) message += `   🏨 Hébergement : ${be.hebergement}\n`;
      if (be.nourriture) message += `   🍽️ Nourriture : ${be.nourriture}\n`;
      if (be.activites) message += `   🎯 Activités : ${be.activites}\n`;
      message += `\n`;
    }

    // --- Points d’intérêt ---
    if (Array.isArray(response.points_interet) && response.points_interet.length) {
      message += `📌 **Points d’intérêt** : ${response.points_interet.join(" • ")}\n\n`;
    }

    // --- Itinéraire détaillé ---
    if (Array.isArray(response.itineraire) && response.itineraire.length) {
      message += `🗺️ **ITINÉRAIRE DÉTAILLÉ**\n───\n\n`;
      response.itineraire.forEach((jour: any, index: number) => {
        const j = Number.isFinite(jour?.jour) ? jour.jour : index + 1;
        const lieu = jour?.lieu || "Lieu non défini";
        message += `📍 **Jour ${j} :** ${lieu}\n`;

        // Description générale
        if (jour?.description) message += `   📝 ${jour.description}\n`;

        // Distance & temps
        if (jour?.distance) message += `   📏 Distance : ${jour.distance}\n`;
        if (jour?.temps_conduite) message += `   🚗 Temps de conduite : ${jour.temps_conduite}\n`;

        // 🌤️ Météo
        if (jour?.meteo) message += `   ⛅ Météo : ${jour.meteo}\n`;

        // Étapes recommandées
        if (Array.isArray(jour?.etapes_recommandees) && jour.etapes_recommandees.length) {
          message += `   🎯 Étapes recommandées :\n`;
          jour.etapes_recommandees.forEach((e: string) => (message += `     • ${e}\n`));
        }

        // Activités → toujours en liste
        if (Array.isArray(jour?.activites) && jour.activites.length) {
          message += `   🎨 Activités proposées :\n`;
          jour.activites.forEach((a: string) => (message += `     • ${a}\n`));
        }

        // Hébergement
        if (jour?.hebergement) message += `   🏨 Hébergement suggéré : ${jour.hebergement}\n`;

        message += `\n`;
        if (index < response.itineraire.length - 1) message += `🔸🔸🔸\n\n`;
      });
    }

    // --- Conseils pratiques ---
    if (Array.isArray(response.conseils) && response.conseils.length) {
      message += `💡 **CONSEILS PRATIQUES**\n───\n`;
      response.conseils.forEach((c: string) => (message += `🔸 ${c}\n`));
      message += `\n`;
    }

    // --- Appel à l'action ---
    if (response.appel_action) {
      message += `👉 ${response.appel_action}\n`;
    }

    return message;
  }

  // --- Fallback générique ---
  message += `🤖 **RÉPONSE DE L'ASSISTANT**\n───\n`;
  if (response.content) message += `${response.content}`;
  else if (response.message) message += `${response.message}`;
  else if (response.reponse) message += `${response.reponse}`;
  else message += `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;

  return message;
}

// Helpers
function toNumber(v: any): number {
  const s = String(v || "").toLowerCase().replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes("k")) {
    const base = parseFloat(s.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return isNaN(base) ? 0 : base * 1000;
  }
  const num = parseFloat(s.replace(/[^0-9.,-]/g, "").replace(",", "."));
  return isNaN(num) ? 0 : num;
}

function toEuro(n: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + "€";
  } catch {
    return `${Math.round(n)}€`;
  }
}

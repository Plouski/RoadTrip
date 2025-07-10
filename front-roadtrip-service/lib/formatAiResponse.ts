export function formatAiResponse(response: any): string {
  console.log("🎨 === DÉBUT FORMATAGE ===");
  console.log("📝 RÉPONSE REÇUE:", response);

  if (!response) return "❌ Aucune réponse reçue. Veuillez réessayer.";

  if (typeof response === "string") {
    try {
      response = JSON.parse(response);
    } catch {
      return response;
    }
  }

  if (typeof response !== "object") return "❌ Format de réponse invalide. Veuillez réessayer.";

  if (response.type === "error") {
    return `❌ **Erreur** : ${response.message || "Une erreur s'est produite."}\n\nVeuillez reformuler votre demande.`;
  }

  let message = "";

  if (response.type === "roadtrip_itinerary") {
    message += `\n✨ **ROADTRIP : ${response.destination?.toUpperCase() || "DESTINATION INCONNUE"}**\n`;
    message += `🗓️ Durée recommandée : **${response.duree_recommandee || "X jours"}**\n`;
    message += `📅 Saison idéale : **${response.saison_ideale || "Toute l'année"}**\n`;
    message += `💰 Budget estimé : **${response.budget_estime?.montant || "À définir"}**\n\n`;

    if (response.meteo_actuelle) {
      const meteo = response.meteo_actuelle;
      const icon = getWeatherIcon(meteo.condition);
      message += `🌤️ **Météo à ${meteo.lieu}**\n`;
      message += `   ${icon} ${meteo.condition}, ${meteo.temperature}\n`;
      if (meteo.humidity) message += `   💧 Humidité : ${meteo.humidity}\n`;
      if (meteo.wind_speed) message += `   💨 Vent : ${meteo.wind_speed}\n`;
      message += `\n`;
    }

    if (response.budget_estime?.details) {
      const d = response.budget_estime.details;
      message += `📊 **Répartition du budget :**\n`;
      if (d.hebergement) message += `   🏨 Hébergement : ${d.hebergement}\n`;
      if (d.nourriture) message += `   🍽️ Nourriture : ${d.nourriture}\n`;
      if (d.carburant) message += `   ⛽ Carburant : ${d.carburant}\n`;
      if (d.activites) message += `   🎯 Activités : ${d.activites}\n`;
      message += `\n`;
    }

    if (response.itineraire?.length) {
      message += `🗺️ **ITINÉRAIRE DÉTAILLÉ**\n`;
      message += `───\n\n`;
      response.itineraire.forEach((jour: any, index: number) => {
        message += `📍 **Jour ${jour.jour} :** ${jour.trajet}\n`;
        if (jour.distance) message += `   📏 Distance : ${jour.distance}\n`;
        if (jour.temps_conduite) message += `   🚗 Temps de conduite : ${jour.temps_conduite}\n`;

        if (jour.etapes_recommandees?.length) {
          message += `   🎯 Étapes recommandées :\n`;
          jour.etapes_recommandees.forEach((e: string) => {
            message += `     • ${e}\n`;
          });
        }

        if (jour.activites?.length) {
          message += `   🎨 Activités proposées :\n`;
          jour.activites.forEach((a: string) => {
            message += `     • ${a}\n`;
          });
        }

        if (jour.hebergement) {
          message += `   🏨 Hébergement suggéré : ${jour.hebergement}\n`;
        }

        message += `\n`;
        if (index < response.itineraire.length - 1) {
          message += `🔸🔸🔸\n\n`;
        }
      });
    }

    if (response.conseils_route?.length) {
      message += `💡 **CONSEILS PRATIQUES**\n`;
      message += `───\n`;
      response.conseils_route.forEach((c: string) => {
        message += `🔸 ${c}\n`;
      });
      message += `\n`;
    }

    if (response.equipement_essentiel?.length) {
      message += `🎒 **ÉQUIPEMENT ESSENTIEL**\n`;
      message += `───\n`;
      response.equipement_essentiel.forEach((item: string) => {
        message += `✅ ${item}\n`;
      });
      message += `\n`;
    }

    if (response.apps_recommandees?.length) {
      message += `📱 **APPLICATIONS UTILES**\n`;
      message += `───\n`;
      response.apps_recommandees.forEach((app: any) => {
        message += `📲 **${app.nom}** — ${app.description}\n`;
      });
      message += `\n`;
    }

    return message;
  }

  if (response.type === "roadtrip_advice") {
    message += `🧭 **CONSEILS PERSONNALISÉS**\n`;
    message += `Sujet : **${response.sujet || "Conseil général"}**\n\n`;
    message += `${response.reponse || "Pas de réponse complète disponible."}\n\n`;

    if (response.recommandations?.length) {
      message += `✅ **RECOMMANDATIONS**\n`;
      message += `───\n`;
      response.recommandations.forEach((rec: any) => {
        if (typeof rec === "object" && rec.destination) {
          message += `🎯 **${rec.destination}**\n`;
          if (rec.activites?.length) {
            rec.activites.forEach((act: string) => {
              message += `   • ${act}\n`;
            });
          }
          if (rec.hebergement) {
            message += `   🏨 Hébergement : ${rec.hebergement}\n`;
          }
          message += `\n`;
        } else if (rec?.titre) {
          message += `💡 **${rec.titre}**\n`;
          if (rec.description) {
            message += `   ${rec.description}\n`;
          }
          message += `\n`;
        } else if (typeof rec === "string") {
          message += `• ${rec}\n`;
        }
      });
    }

    if (response.ressources_utiles?.length) {
      message += `🔗 **RESSOURCES UTILES**\n`;
      message += `───\n`;
      response.ressources_utiles.forEach((r: string) => {
        message += `🔗 ${r}\n`;
      });
      message += `\n`;
    }

    message += `═`.repeat(40) + `\n`;
    message += `✨ *Conseil généré le ${formatDate(response.generated_at)}*`;
    return message;
  }

  // Fallback
  message += `🤖 **RÉPONSE DE L'ASSISTANT**\n`;
  message += `───\n`;
  if (response.content) message += `${response.content}`;
  else if (response.message) message += `${response.message}`;
  else if (response.reponse) message += `${response.reponse}`;
  else message += `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;

  return message;
}

function getWeatherIcon(condition: string): string {
  const lower = condition?.toLowerCase() || "";
  if (lower.includes("soleil") || lower.includes("clear") || lower.includes("sun")) return "☀️";
  if (lower.includes("nuage") || lower.includes("cloud") || lower.includes("couvert")) return "☁️";
  if (lower.includes("pluie") || lower.includes("rain")) return "🌧️";
  if (lower.includes("orage") || lower.includes("storm")) return "⛈️";
  if (lower.includes("neige") || lower.includes("snow")) return "❄️";
  if (lower.includes("brouillard") || lower.includes("fog")) return "🌫️";
  return "🌤️";
}

function formatDate(dateString?: string): string {
  if (!dateString) return "aujourd'hui";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "aujourd'hui";
  }
}

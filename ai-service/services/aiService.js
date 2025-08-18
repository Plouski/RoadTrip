const NodeCache = require("node-cache");
const axios = require("axios");
const logger = require("../utils/logger");
const metrics = require("../metrics");
const { isRoadtripRelated } = require("../utils/roadtripValidation");
const { extractDurationFromQuery } = require("../utils/durationExtractor");
const { generateCacheKey } = require("../utils/cacheKey");

let OpenAI;
let openai;

try {
  const openaiModule = require("openai");
  OpenAI = openaiModule.default || openaiModule.OpenAI || openaiModule;
  
  if (typeof OpenAI !== 'function') {
    throw new Error('OpenAI import failed');
  }
  
  if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV !== 'test') {
    throw new Error('OPENAI_API_KEY manquante');
  }
  
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY || 'test-key-for-testing'
  });
  
  logger.info('✅ OpenAI initialisé avec succès');
  
} catch (error) {
  logger.error(`❌ Erreur initialisation OpenAI: ${error.message}`);
  
  openai = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                type: 'roadtrip_itinerary',
                destination: 'France (Mode Fallback)',
                duree_recommandee: '7 jours',
                budget_estime: {
                  total: '1200€',
                  transport: '300€',
                  hebergement: '500€',
                  nourriture: '250€',
                  activites: '150€'
                },
                saison_ideale: 'Printemps-Été',
                points_interet: ['Paris', 'Loire', 'Provence'],
                itineraire: [{
                  jour: 1,
                  lieu: 'Paris',
                  description: 'Découverte de la capitale',
                  activites: ['Tour Eiffel', 'Louvre'],
                  distance: '0 km',
                  temps_conduite: '0h',
                  hebergement: 'Hôtel centre-ville'
                }],
                conseils: ['Mode fallback activé', 'Configurez OPENAI_API_KEY']
              })
            }
          }]
        })
      }
    }
  };
  
  logger.warn('⚠️ Mode fallback OpenAI activé');
}

const cache = new NodeCache({ stdTTL: 3600 });

function parseStrictJSON(text) {
  if (typeof text !== "string") return text;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Réponse IA non JSON");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function parseAmountToNumber(v) {
  if (v == null) return 0;
  const s = String(v).toLowerCase().replace(/\s/g, "");
  if (s.includes("k")) {
    const base = parseFloat(s.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return isNaN(base) ? 0 : base * 1000;
  }
  const num = parseFloat(s.replace(/[^0-9.,-]/g, "").replace(",", "."));
  return isNaN(num) ? 0 : num;
}

function formatEuro(n) {
  try {
    return (
      new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) +
      "€"
    );
  } catch {
    return `${Math.round(n)}€`;
  }
}

function ensureShape(obj) {
  const out = {};
  out.type = "roadtrip_itinerary";
  out.destination = obj?.destination?.trim() || "Destination inconnue";
  out.duree_recommandee = obj?.duree_recommandee?.trim() || "X jours";

  const be = obj?.budget_estime || {};
  const details = {
    transport: be.transport || be.transports || null,
    hebergement: be.hebergement || be.logement || null,
    nourriture: be.nourriture || be.repas || null,
    activites: be.activites || null,
  };
  let total =
    be.total ||
    be.montant ||
    (() => {
      const sum =
        parseAmountToNumber(details.transport) +
        parseAmountToNumber(details.hebergement) +
        parseAmountToNumber(details.nourriture) +
        parseAmountToNumber(details.activites);
      return sum > 0 ? formatEuro(sum) : null;
    })();

  out.budget_estime = {
    total: total || "À définir",
    transport: details.transport || "À définir",
    hebergement: details.hebergement || "À définir",
    nourriture: details.nourriture || "À définir",
    activites: details.activites || "À définir",
  };

  out.saison_ideale = obj?.saison_ideale?.trim() || "Inconnue";
  out.points_interet = Array.isArray(obj?.points_interet)
    ? obj.points_interet.map(String)
    : [];

  out.itineraire = Array.isArray(obj?.itineraire)
    ? obj.itineraire.map((j, i) => ({
        jour: Number.isFinite(j?.jour) ? j.jour : i + 1,
        lieu: j?.lieu?.trim() || "Lieu non défini",
        description: j?.description?.trim() || "",
        activites: Array.isArray(j?.activites) ? j.activites.map(String) : [],
        distance: j?.distance || "À définir",
        temps_conduite: j?.temps_conduite || "À définir",
        hebergement: j?.hebergement || undefined,
      }))
    : [];

  out.conseils = Array.isArray(obj?.conseils) ? obj.conseils.map(String) : [];

  return out;
}

function generateFallbackItinerary(location, duration) {
  return ensureShape({
    destination: location || "Destination inconnue",
    duree_recommandee: `${duration || 7} jours`,
    budget_estime: {
      total: "À définir",
      transport: "À définir",
      hebergement: "À définir",
      nourriture: "À définir",
      activites: "À définir",
    },
    saison_ideale: "Inconnue",
    points_interet: [],
    itineraire: [],
    conseils: [],
  });
}

async function getWeatherInfo(city, days = 7) {
  try {
    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=fr&format=json`
    );
    if (!geoRes.data.results?.length) return null;
    const { latitude, longitude } = geoRes.data.results[0];
    const meteoRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=${Math.min(
        days,
        15
      )}&timezone=auto&language=fr`
    );
    return meteoRes.data.daily || null;
  } catch (err) {
    logger.warn(`Impossible de récupérer la météo: ${err.message}`);
    return null;
  }
}

const SYSTEM_PROMPT = `
Tu es un expert en organisation de voyages et en création d'itinéraires immersifs.
La destination doit être extraite ou déduite de la requête utilisateur.
Toujours répondre en français.
NE JAMAIS ajouter de texte en dehors de l'objet JSON.
Remplis TOUS les champs, même par "À définir" si aucune info.

IMPORTANT : les champs "distance" et "temps_conduite" doivent contenir des estimations réalistes (pas "À définir").

{
  "type": "roadtrip_itinerary",
  "destination": "Nom du pays ou ville",
  "duree_recommandee": "X jours",
  "budget_estime": {
    "total": "valeur + devise",
    "transport": "valeur + devise",
    "hebergement": "valeur + devise",
    "nourriture": "valeur + devise",
    "activites": "valeur + devise"
  },
  "saison_ideale": "Saison(s) idéale(s)",
  "points_interet": ["Nom lieu 1", "Nom lieu 2", "Nom lieu 3"],
  "itineraire": [
    {
      "jour": 1,
      "lieu": "Nom du lieu",
      "description": "Résumé inspirant",
      "activites": ["Activité 1", "Activité 2"],
      "distance": "XX km",
      "temps_conduite": "Xh",
      "hebergement": "Nom ou type"
    }
  ],
  "conseils": ["Conseil 1", "Conseil 2"],
}
`.trim();

async function callOpenAIWithRetry(messages, retries = 2) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      });
      
      logger.info(`✅ OpenAI réponse reçue (tentative ${attempt})`);
      return response;
      
    } catch (err) {
      lastError = err;
      logger.warn(`⚠️ Tentative OpenAI ${attempt} échouée: ${err.message}`);
      if (attempt <= retries) {
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

/* Service principal */
async function generateRoadtripAdvisor(options) {
  const t0 = Date.now();

  if (!isRoadtripRelated(options.query)) {
    return { type: "error", message: "Requête non liée à un roadtrip." };
  }

  if (!options.duration) {
    const { days, error } = extractDurationFromQuery(options.query);
    if (error) return { type: "error", message: error };
    options.duration = days || 7;
  }
  if (options.duration > 15) {
    return { type: "error", message: "⛔ Limité à 15 jours maximum." };
  }

  const cacheKey = generateCacheKey(options);
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info('📦 Réponse depuis le cache');
    return cached;
  }

  try {
    logger.info(`🤖 Appel OpenAI pour: "${options.query}" (${options.duration} jours)`);
    
    const response = await callOpenAIWithRetry([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: options.query },
    ]);

    const raw = response.choices?.[0]?.message?.content?.trim() || "";
    const json = parseStrictJSON(raw);
    const itinerary = ensureShape(json);

    if (Array.isArray(itinerary.itineraire) && itinerary.itineraire.length) {
      logger.info('🌤️ Ajout informations météo...');
      for (let i = 0; i < Math.min(itinerary.itineraire.length, 5); i++) {
        const jour = itinerary.itineraire[i];
        const lieu =
          jour?.lieu && jour.lieu !== "Lieu non défini"
            ? jour.lieu
            : itinerary.destination;
        if (!lieu) {
          jour.meteo = "À définir";
          continue;
        }
        try {
          const daily = await getWeatherInfo(lieu, 1);
          if (
            daily &&
            daily.temperature_2m_max &&
            daily.temperature_2m_min &&
            daily.precipitation_sum
          ) {
            const tmin = daily.temperature_2m_min[0];
            const tmax = daily.temperature_2m_max[0];
            const prcp = daily.precipitation_sum[0];
            jour.meteo = `${Math.round(tmin)}°C – ${Math.round(
              tmax
            )}°C, précipitations: ${Math.round(prcp)} mm`;
          } else {
            jour.meteo = "À définir";
          }
        } catch {
          jour.meteo = "À définir";
        }
      }
    }

    cache.set(cacheKey, itinerary);

    if (metrics?.httpRequestDuration?.observe) {
      metrics.httpRequestDuration.observe(
        { method: "POST", route: "/ask", status_code: 200 },
        (Date.now() - t0) / 1000
      );
    }

    logger.info(`✅ Itinéraire généré: ${itinerary.destination} (${(Date.now() - t0)}ms)`);
    return itinerary;

  } catch (error) {
    logger.error(`❌ Erreur OpenAI: ${error.message}`);
    if (metrics?.httpRequestDuration?.observe) {
      metrics.httpRequestDuration.observe(
        { method: "POST", route: "/ask", status_code: 500 },
        (Date.now() - t0) / 1000
      );
    }
    return generateFallbackItinerary(options.location, options.duration);
  }
}

module.exports = { generateRoadtripAdvisor };
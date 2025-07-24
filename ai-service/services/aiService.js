const { OpenAI } = require("openai");
const dotenv = require("dotenv");
const NodeCache = require("node-cache");
const axios = require("axios");
const logger = require("../utils/logger");

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600 });

logger.info('🚀 Service IA initialisé', {
  hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  hasWeatherKey: !!process.env.WEATHER_API_KEY,
  cacheConfig: { stdTTL: 3600 }
});

// Validation du contenu roadtrip
const isRoadtripRelated = (query) => {
  const startTime = Date.now();
  
  try {
    if (!query || typeof query !== 'string') {
      logger.debug('Validation échouée: query invalide', { 
        queryType: typeof query,
        hasQuery: !!query 
      });
      return false;
    }

    const queryLower = query.toLowerCase().trim();
    
    const travelKeywords = [
      // Voyage général
      'voyage', 'voyager', 'partir', 'aller', 'visiter', 'trip', 'travel',
      'roadtrip', 'road trip', 'itinéraire', 'itinerary', 'route',
      
      // Destinations
      'pays', 'ville', 'région', 'destination', 'country', 'city',
      
      // Durée
      'jour', 'jours', 'semaine', 'semaines', 'mois', 'day', 'days', 'week', 'weeks', 'month',
      
      // Transport
      'voiture', 'conduire', 'rouler', 'car', 'drive', 'driving',
      
      // Hébergement
      'hébergement', 'hôtel', 'hotel', 'logement', 'dormir', 'rester',
      
      // Activités
      'voir', 'faire', 'activité', 'activités', 'visiter', 'découvrir',
      'restaurant', 'manger', 'culture', 'musée', 'monument',
      
      // Budget
      'budget', 'prix', 'coût', 'coûter', 'euro', 'euros', '€', 'money',
      
      // Noms de pays/régions populaires
      'france', 'espagne', 'italie', 'allemagne', 'portugal', 'maroc',
      'tunisie', 'grèce', 'croatie', 'suisse', 'belgique', 'pays-bas',
      'norvège', 'suède', 'danemark', 'islande', 'irlande', 'ecosse',
      'angleterre', 'pologne', 'république tchèque', 'hongrie', 'autriche',
      'europe', 'méditerranée', 'scandinavie', 'balkans'
    ];

    const hasKeyword = travelKeywords.some(keyword => 
      queryLower.includes(keyword)
    );

    const travelPatterns = [
      /\b(je|j'|nous|on)\s+(veux|voudrait|aimerais|aimerions|souhaite|projette|prévoit|pense)\s+.*(partir|aller|visiter|voir|découvrir)/i,
      /\b(où|comment|quand|combien)\s+.*(partir|aller|voyager|visiter)/i,
      /\b(itinéraire|programme|planning|plan)\s+.*(voyage|trip|roadtrip)/i,
      /\b(conseils?|suggestions?|recommandations?|idées?)\s+.*(voyage|destination|roadtrip)/i,
      /\b(budget|prix|coût)\s+.*(voyage|trip|roadtrip)/i,
      /\b(que|quoi)\s+.*(faire|voir|visiter)\s+.*(pendant|durant|lors)/i
    ];

    const hasPattern = travelPatterns.some(pattern => 
      pattern.test(queryLower)
    );

    const isValid = hasKeyword || hasPattern;
    const processingTime = Date.now() - startTime;

    logger.debug('🔍 Validation roadtrip terminée', {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      queryLength: query.length,
      hasKeyword,
      hasPattern,
      isValid,
      processingTime
    });
    
    return isValid;
    
  } catch (error) {
    logger.error("❌ Erreur dans isRoadtripRelated", {
      error: {
        message: error.message,
        stack: error.stack
      },
      query: query ? query.substring(0, 100) : null
    });
    return false;
  }
};

// Extraction de la durée depuis la requête
const extractDurationFromQuery = (query) => {
  const startTime = Date.now();
  
  try {
    if (!query || typeof query !== 'string') {
      return null;
    }

    const queryLower = query.toLowerCase().trim();
    
    const monthKeywords = ['mois', 'month', 'months'];
    const weekKeywords = ['semaine', 'semaines', 'week', 'weeks'];
    const dayKeywords = ['jour', 'jours', 'day', 'days'];
    
    const numberMatches = queryLower.match(/\b(\d+)\b/g);
    if (!numberMatches || numberMatches.length === 0) {
      return null;
    }
    
    let extractedDuration = null;
    
    for (const numberStr of numberMatches) {
      const num = parseInt(numberStr, 10);
      
      if (isNaN(num) || num <= 0) {
        continue;
      }
      
      if (monthKeywords.some(keyword => queryLower.includes(keyword))) {
        extractedDuration = num * 30;
        break;
      }
      
      if (weekKeywords.some(keyword => queryLower.includes(keyword))) {
        extractedDuration = num * 7;
        break;
      }
      
      if (dayKeywords.some(keyword => queryLower.includes(keyword))) {
        extractedDuration = num;
        break;
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    if (extractedDuration) {
      logger.debug('📅 Durée extraite avec succès', {
        query: query.substring(0, 50) + '...',
        extractedDuration,
        unit: extractedDuration > 30 ? 'months' : extractedDuration > 7 ? 'weeks' : 'days',
        processingTime
      });
    }
    
    return extractedDuration;
  } catch (error) {
    logger.error("❌ Erreur dans extractDurationFromQuery", {
      error: {
        message: error.message,
        stack: error.stack
      },
      query: query ? query.substring(0, 100) : null
    });
    return null;
  }
};

// Service principal pour générer un itinéraire de roadtrip personnalisé
const roadtripAdvisorService = async (options) => {
  const serviceStart = Date.now();
  
  try {
    const {
      query,
      location,
      duration,
      budget,
      travelStyle,
      interests = [],
      includeWeather = false,
    } = options;

    logger.ai('🚀 Début génération roadtrip', {
      query: query ? query.substring(0, 100) + '...' : null,
      location,
      duration,
      budget,
      travelStyle,
      interestsCount: interests.length,
      includeWeather
    });

    if (!isRoadtripRelated(query)) {
      logger.security('❌ Requête non-roadtrip détectée', {
        query: query ? query.substring(0, 50) + '...' : null,
        queryLength: query ? query.length : 0,
        processingTime: Date.now() - serviceStart
      });
      
      return {
        type: "error",
        message: "❌ Je suis un assistant spécialisé dans les roadtrips et voyages. Je ne peux vous aider que pour planifier des itinéraires de voyage, conseiller des destinations, ou organiser des roadtrips. Pourriez-vous me poser une question liée aux voyages ?",
        error_type: "invalid_topic"
      };
    }

    let finalDuration = duration;
    
    if (!finalDuration && query) {
      finalDuration = extractDurationFromQuery(query);
    }

    if (finalDuration && finalDuration > 14) {
      logger.warn("⚠️ Durée demandée excessive", {
        requestedDuration: finalDuration,
        maxDuration: 14,
        query: query ? query.substring(0, 50) + '...' : null,
        processingTime: Date.now() - serviceStart
      });
      
      return {
        type: "error",
        message: "❌ La durée maximale pour un roadtrip est de 2 semaines (14 jours). Veuillez réduire la durée de votre voyage.",
        max_duration: 14,
        requested_duration: finalDuration
      };
    }

    const cacheKey = generateCacheKey(options);
    if (cache.has(cacheKey)) {
      const cachedResult = cache.get(cacheKey);
      logger.ai('✅ Résultat récupéré depuis le cache', {
        cacheKey: cacheKey.substring(0, 20) + '...',
        destination: cachedResult.destination,
        processingTime: Date.now() - serviceStart
      });
      return cachedResult;
    }

    let weatherInfo = null;
    let contextAddition = "";

    if (location && includeWeather) {
      const weatherStart = Date.now();
      weatherInfo = await getWeatherData(location);
      const weatherTime = Date.now() - weatherStart;
      
      if (weatherInfo) {
        contextAddition += `Météo actuelle à ${location} : ${weatherInfo.condition}, ${weatherInfo.temperature}°C.`;
        logger.info('🌤️ Données météo récupérées', {
          location,
          condition: weatherInfo.condition,
          temperature: weatherInfo.temperature,
          weatherTime
        });
      } else {
        logger.warn('⚠️ Impossible de récupérer les données météo', {
          location,
          weatherTime
        });
      }
    }

    const systemPrompt = createSystemPrompt({
      travelStyle,
      duration: finalDuration,
      budget,
      interests,
      contextAddition,
    });

    const userPrompt = query;

    logger.ai('🤖 Appel OpenAI en cours', {
      model: 'gpt-4o',
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      temperature: 0.7
    });

    const openaiStart = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    const openaiTime = Date.now() - openaiStart;

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      logger.error('❌ OpenAI n\'a pas généré de contenu', {
        response: response?.choices || null,
        openaiTime
      });
      return { type: "error", message: "Aucune réponse générée." };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.error('❌ Erreur parsing JSON OpenAI', {
        error: parseError.message,
        content: content.substring(0, 200) + '...',
        openaiTime
      });
      return { type: "error", message: "Réponse invalide de l'IA." };
    }

    const finalResponse = {
      ...parsed,
      generated_at: new Date().toISOString(),
      location,
      ...(weatherInfo && {
        meteo_actuelle: {
          lieu: location,
          condition: weatherInfo.condition,
          temperature: `${weatherInfo.temperature}°C`,
        },
      }),
    };

    cache.set(cacheKey, finalResponse);
    
    const totalTime = Date.now() - serviceStart;
    
    logger.ai('✅ Roadtrip généré avec succès', {
      destination: finalResponse.destination,
      duration: finalResponse.duree_recommandee,
      budget: finalResponse.budget_estime?.montant,
      itineraryDays: finalResponse.itineraire?.length || 0,
      hasWeatherData: !!finalResponse.meteo_actuelle,
      openaiTime,
      totalTime,
      cached: false
    });

    return finalResponse;
  } catch (error) {
    const totalTime = Date.now() - serviceStart;
    
    logger.error("❌ Erreur critique dans roadtripAdvisorService", {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      options: {
        location: options.location,
        duration: options.duration,
        budget: options.budget,
        queryLength: options.query?.length || 0
      },
      totalTime
    });
    
    return {
      type: "error",
      message: "Erreur lors de la génération des recommandations.",
      error: error.message,
    };
  }
};

// Prompt système destiné à guider l'IA
const createSystemPrompt = ({
  travelStyle,
  duration,
  budget,
  interests,
  contextAddition,
}) => {
  let prompt = `
Tu es un expert en organisation de roadtrips. Génère un itinéraire structuré au format JSON suivant :

🚨 RÈGLE IMPORTANTE : La durée maximale pour un roadtrip est de 14 jours (2 semaines). Ne génère jamais d'itinéraires dépassant cette limite.

{
  "type": "roadtrip_itinerary",
  "destination": "Nom du pays ou région",
  "duree_recommandee": "X jours (maximum 14 jours)",
  "budget_estime": {
    "montant": "XXX€",
    "details": {
      "hebergement": "XX€/jour",
      "nourriture": "XX€/jour",
      "carburant": "XX€/jour",
      "activites": "XX€/jour"
    }
  },
  "saison_ideale": "Saison conseillée",
  "itineraire": [
    {
      "jour": 1,
      "trajet": "Ville de départ → Ville d'arrivée",
      "distance": "en km",
      "etapes_recommandees": ["Lieu 1", "Lieu 2"],
      "hebergement": "Type ou nom de logement",
      "activites": ["Activité 1", "Activité 2"]
    }
  ],
  "conseils_route": ["Conseil 1", "Conseil 2"],
  "equipement_essentiel": ["Objet 1", "Objet 2"],
  "meteo_actuelle": {
    "lieu": "Nom de la ville",
    "condition": "Ciel clair",
    "temperature": "25°C"
  }
}

Remplis le champ "meteo_actuelle" uniquement si des données météo sont fournies.

Utilise des lieux réels, donne des conseils utiles, et adapte les suggestions au climat si connu.`.trim();

  if (travelStyle) prompt += `\nStyle : ${travelStyle}.`;
  if (duration) prompt += `\nDurée : ${duration} jours (maximum 14 jours autorisés).`;
  if (budget) prompt += `\nBudget : ${budget}€.`;
  if (interests.length) prompt += `\nIntérêts : ${interests.join(", ")}.`;
  if (contextAddition) {
    prompt += `\n\nInformations supplémentaires à prendre en compte :\n${contextAddition}\n`;
    prompt += `Incorpore ces informations dans l'itinéraire, les activités ou les conseils.`;
  }

  logger.debug('🎯 System prompt créé', {
    promptLength: prompt.length,
    hasTravelStyle: !!travelStyle,
    hasDuration: !!duration,
    hasBudget: !!budget,
    interestsCount: interests?.length || 0,
    hasContextAddition: !!contextAddition
  });

  return prompt;
};

// Génère une clé de cache
const generateCacheKey = (options) => {
  const keyData = {
    query: options.query,
    location: options.location,
    duration: options.duration,
    budget: options.budget,
    travelStyle: options.travelStyle,
    interests: (options.interests || []).sort(),
  };
  
  const key = `roadtrip_${Buffer.from(JSON.stringify(keyData)).toString("base64")}`;
  
  logger.debug('🔑 Clé de cache générée', {
    keyLength: key.length,
    keyPreview: key.substring(0, 30) + '...',
    hasQuery: !!options.query,
    hasLocation: !!options.location,
    hasDuration: !!options.duration
  });
  
  return key;
};

// Récupère la météo actuelle via OpenWeatherMap
const getWeatherData = async (location) => {
  const weatherStart = Date.now();
  
  try {
    const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    if (!WEATHER_API_KEY) {
      logger.warn('⚠️ Clé API météo manquante', { location });
      return null;
    }

    logger.debug('🌤️ Récupération météo en cours', { location });

    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: location,
          appid: WEATHER_API_KEY,
          units: "metric",
          lang: "fr",
        },
        timeout: 5000
      }
    );

    const weatherTime = Date.now() - weatherStart;
    const weatherInfo = {
      condition: data.weather[0].description,
      temperature: Math.round(data.main.temp),
    };

    logger.info('✅ Météo récupérée avec succès', {
      location,
      condition: weatherInfo.condition,
      temperature: weatherInfo.temperature,
      weatherTime,
      apiResponse: {
        main: data.main,
        weather: data.weather[0]
      }
    });

    return weatherInfo;
  } catch (error) {
    const weatherTime = Date.now() - weatherStart;
    
    if (error.code === 'ECONNABORTED') {
      logger.warn("⏰ Timeout récupération météo", {
        location,
        weatherTime,
        timeout: 5000
      });
    } else if (error.response?.status === 404) {
      logger.warn("🌍 Lieu météo introuvable", {
        location,
        weatherTime,
        statusCode: error.response.status
      });
    } else {
      logger.error("❌ Erreur récupération météo", {
        location,
        weatherTime,
        error: {
          message: error.message,
          code: error.code,
          status: error.response?.status
        }
      });
    }
    
    return null;
  }
};

module.exports = { 
  roadtripAdvisorService,
};
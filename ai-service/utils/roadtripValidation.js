// utils/roadtripValidation.js
function stripDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove accents
}

function isRoadtripRelated(raw) {
  if (!raw || typeof raw !== 'string') return false;

  // Normalisation
  const text = stripDiacritics(raw).toLowerCase();

  // Indices d’intention voyage
  const intent = [
    'roadtrip', 'road trip',
    'voyage', 'voyager',
    'partir', 'aller',
    'itineraire', 'itinerary',
    'visiter', 'trip', 'travel'
  ];

  // Indices de temps / durée
  const timeHints = [
    'jour', 'jours', 'semaine', 'semaines',
    'week', 'weeks', 'day', 'days', 'mois'
  ];

  // Indices de destination
  const placeHints = [
    'pays', 'ville', 'region', 'destination'
  ];

  // Regex durée explicite: "8 jours", "2 semaines", "7j", "10d"
  const durationRegex = /\b(\d{1,3})\s*(j|jours?|d|day|days|semaines?|weeks?)\b/;

  // Au moins un indice d’intention
  const hasIntent = intent.some(k => text.includes(k));
  // au moins un indice de destination OU durée explicite OU mot-clef "pendant"
  const hasTime = timeHints.some(k => text.includes(k)) || durationRegex.test(text) || text.includes('pendant');
  // heuristique destination (un pays/ville n’est pas trivial => on se contente de mots usuels + nombres + "au/aux/en/à")
  const hasPlaceHeuristic = /\b(au|aux|en|a|à)\s+[a-z\u00E0-\u00FC\-]+/i.test(text) || placeHints.some(k => text.includes(k));

  // Règle simple et tolérante: une intention + (durée OU destination)
  return hasIntent && (hasTime || hasPlaceHeuristic);
}

module.exports = { isRoadtripRelated, stripDiacritics };
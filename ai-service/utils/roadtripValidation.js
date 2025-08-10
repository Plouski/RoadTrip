function stripDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isRoadtripRelated(raw) {
  if (!raw || typeof raw !== 'string') return false;

  const text = stripDiacritics(raw).toLowerCase();

  const intent = [
    'roadtrip', 'road trip',
    'voyage', 'voyager',
    'partir', 'aller',
    'itineraire', 'itinerary',
    'visiter', 'trip', 'travel'
  ];

  const timeHints = [
    'jour', 'jours', 'semaine', 'semaines',
    'week', 'weeks', 'day', 'days', 'mois'
  ];

  const placeHints = [
    'pays', 'ville', 'region', 'destination'
  ];

  const durationRegex = /\b(\d{1,3})\s*(j|jours?|d|day|days|semaines?|weeks?)\b/;

  const hasIntent = intent.some(k => text.includes(k));
  const hasTime = timeHints.some(k => text.includes(k)) || durationRegex.test(text) || text.includes('pendant');
  const hasPlaceHeuristic = /\b(au|aux|en|a|à)\s+[a-z\u00E0-\u00FC\-]+/i.test(text) || placeHints.some(k => text.includes(k));

  return hasIntent && (hasTime || hasPlaceHeuristic);
}

module.exports = { isRoadtripRelated, stripDiacritics };
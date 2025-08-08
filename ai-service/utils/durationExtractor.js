// utils/durationExtractor.js
const { stripDiacritics } = require('./roadtripValidation');

function extractDurationFromQuery(raw) {
  if (!raw || typeof raw !== 'string') return { days: null, error: null };

  const text = stripDiacritics(raw).toLowerCase();

  // "8 jours", "7j", "2 semaines", "2w", "1 mois", "1 month"
  const m = text.match(/\b(\d{1,3})\s*(j|jours?|d|day|days|semaines?|weeks?|w|mois|month|months)\b/);
  if (!m) return { days: null, error: null };

  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n <= 0) return { days: null, error: null };

  const unit = m[2];

  // Refus des mois
  if (/mois|month/.test(unit)) {
    return {
      days: null,
      error: "⛔ Les itinéraires sont limités à 15 jours maximum. Indiquez un nombre de jours ou de semaines (ex: 10 jours, 2 semaines)."
    };
  }

  // Conversion semaines -> jours
  let days = /sem|week|w/.test(unit) ? n * 7 : n;

  // Limite 15 jours
  if (days > 15) {
    return { days: null, error: "⛔ Les itinéraires sont limités à 15 jours maximum." };
  }

  return { days, error: null };
}

module.exports = { extractDurationFromQuery };
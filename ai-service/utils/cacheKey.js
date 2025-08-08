const crypto = require("crypto");

function generateCacheKey(options) {
  const keyData = JSON.stringify({
    query: options.query,
    location: options.location,
    duration: options.duration,
    budget: options.budget,
    travelStyle: options.travelStyle,
    interests: (options.interests || []).sort(),
  });

  return `roadtrip_${crypto.createHash("sha256").update(keyData).digest("hex")}`;
}

module.exports = { generateCacheKey };
require("dotenv").config();

module.exports = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.NOTIFICATION_API_KEY) {
    return res.status(403).json({ message: "Accès non autorisé" });
  }
  next();
};
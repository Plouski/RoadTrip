const express = require("express");
const adminController = require("../controllers/adminController");
const { authMiddleware, adminMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// Toutes les routes admin nécessitent une authentification admin
router.use(authMiddleware, adminMiddleware);

// DASHBOARD - Statistiques générales
router.get("/stats", adminController.getStats);
router.get("/users/recent", adminController.getRecentUsers);
router.get("/roadtrips/recent", adminController.getRecentRoadtrips);

// GESTION UTILISATEURS
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", adminController.updateUser);
router.put("/users/status/:id", adminController.updateUserStatus);
router.get("/users/:id/subscription", adminController.getUserSubscription);
router.delete("/users/:id", adminController.deleteUser);

// GESTION ROADTRIPS
router.get("/roadtrips", adminController.getRoadtrips);
router.get("/roadtrips/:id", adminController.getTripById);
router.post("/roadtrips", adminController.createRoadtrip);
router.put("/roadtrips/:id", adminController.updateRoadtrip);
router.patch("/roadtrips/status/:id", adminController.updateRoadtripStatus);
router.delete("/roadtrips/:id", adminController.deleteTrip);

module.exports = router;
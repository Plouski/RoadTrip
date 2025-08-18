const User = require("../models/User");
const Trip = require("../models/Trip");
const AiMessage = require("../models/AiMessage");
const Favorite = require("../models/Favorite");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const toCurrencyCode = (c) => {
  if (!c) return "EUR";
  const up = String(c).toUpperCase();
  return ["EUR", "USD", "GBP"].includes(up) ? up : "EUR";
};

const normalizeBudget = (b) => {
  if (b && typeof b === "object" && "amount" in b) {
    return {
      amount: Number(b.amount) || 0,
      currency: toCurrencyCode(b.currency),
    };
  }
  const amount =
    typeof b === "number"
      ? b
      : typeof b === "string"
      ? Number(b.replace(/[^\d.]/g, "")) || 0
      : 0;
  return { amount, currency: "EUR" };
};

/* Statistiques dashboard admin */
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalTrips,
      publishedTrips,
      totalMessages,
      totalFavorites,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Trip.countDocuments(),
      Trip.countDocuments({ isPublished: true }),
      AiMessage.countDocuments(),
      Favorite.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers,
        },
        trips: {
          total: totalTrips,
          published: publishedTrips,
          draft: totalTrips - publishedTrips,
        },
        engagement: {
          ai_messages: totalMessages,
          favorites: totalFavorites,
        },
      },
    });
  } catch (error) {
    logger.logError("Admin getStats", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
    });
  }
};

/* Utilisateurs récents */
const getRecentUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName email isVerified role createdAt")
      .lean();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    logger.logError("Admin getRecentUsers", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs récents",
    });
  }
};

/* Roadtrips récents */
const getRecentRoadtrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title country bestSeason isPublished views createdAt")
      .lean();

    res.status(200).json({
      success: true,
      roadtrips: trips,
    });
  } catch (error) {
    logger.logError("Admin getRecentRoadtrips", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des roadtrips récents",
    });
  }
};

/* Liste des utilisateurs avec pagination */
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = search
      ? {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password -resetCode -verificationToken")
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (error) {
    logger.logError("Admin getUsers", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs",
    });
  }
};

/* Mise à jour statut utilisateur */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const updateData = {};
    if (typeof isVerified === "boolean") updateData.isVerified = isVerified;
    if (role && ["user", "premium", "admin"].includes(role))
      updateData.role = role;

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password -resetCode -verificationToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    logger.logAuth("User status updated", user, { updatedBy: req.user.email });

    res.status(200).json({
      success: true,
      message: "Statut utilisateur mis à jour",
      user,
    });
  } catch (error) {
    logger.logError("Admin updateUserStatus", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour",
    });
  }
};

const getUserSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID utilisateur invalide" });
    }

    const sub = await Subscription.findOne({ userId: id })
      .sort({ createdAt: -1 })
      .select("plan status startDate paymentMethod currentPeriodEnd createdAt")
      .lean();

    if (!sub) {
      return res.status(200).json({ success: true, subscription: null });
    }

    return res.status(200).json({ success: true, subscription: sub });
  } catch (error) {
    logger.logError("Admin getUserSubscription", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'abonnement",
    });
  }
};

/* Suppression utilisateur avec nettoyage RGPD */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    logger.info(`🗑️ Suppression RGPD utilisateur: ${id}`);

    await Promise.all([
      AiMessage.deleteMany({ userId: id }),
      Favorite.deleteMany({ userId: id }),
      Subscription.deleteMany({ userId: id }),
      Trip.deleteMany({ userId: id }),
    ]);

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    logger.logAuth("User deleted (GDPR)", deletedUser, {
      deletedBy: req.user.email,
      dataCleanup: ["aimessages", "favorites", "subscriptions", "trips"],
    });

    res.status(200).json({
      success: true,
      message: "Utilisateur et données associées supprimés (RGPD compliant)",
    });
  } catch (error) {
    logger.logError("Admin deleteUser", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
    });
  }
};

/* Liste des roadtrips avec pagination */
const getRoadtrips = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } },
            { tags: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("userId", "firstName lastName email")
        .lean(),
      Trip.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      trips,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (error) {
    logger.logError("Admin getRoadtrips", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des roadtrips",
    });
  }
};

/* Mise à jour statut roadtrip */
const updateRoadtripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished, isPremium } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID roadtrip invalide",
      });
    }

    const updateData = {};
    if (typeof isPublished === "boolean") updateData.isPublished = isPublished;
    if (typeof isPremium === "boolean") updateData.isPremium = isPremium;

    const trip = await Trip.findByIdAndUpdate(id, updateData, { new: true });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Roadtrip non trouvé",
      });
    }

    logger.info(`📝 Roadtrip ${id} mis à jour:`, updateData);

    res.status(200).json({
      success: true,
      message: "Statut roadtrip mis à jour",
      trip: {
        id: trip._id,
        title: trip.title,
        isPublished: trip.isPublished,
        isPremium: trip.isPremium,
      },
    });
  } catch (error) {
    logger.logError("Admin updateRoadtripStatus", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour",
    });
  }
};

/* Suppression roadtrip */
const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID roadtrip invalide",
      });
    }

    await Favorite.deleteMany({ tripId: id });

    const deletedTrip = await Trip.findByIdAndDelete(id);
    if (!deletedTrip) {
      return res.status(404).json({
        success: false,
        message: "Roadtrip non trouvé",
      });
    }

    logger.info(`🗑️ Roadtrip supprimé: ${deletedTrip.title}`);

    res.status(200).json({
      success: true,
      message: "Roadtrip supprimé avec succès",
    });
  } catch (error) {
    logger.logError("Admin deleteTrip", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
    });
  }
};

/* Récupérer un roadtrip par ID pour édition */
const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID roadtrip invalide" });
    }

    const trip = await Trip.findById(id)
      .populate("userId", "firstName lastName email")
      .lean();
    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Roadtrip non trouvé" });
    }

    const normalized = {
      ...trip,
      budget: normalizeBudget(trip.budget),
      duration: Number(trip.duration) || 0,
    };

    res.status(200).json({ success: true, trip: normalized });
  } catch (error) {
    logger.logError("Admin getTripById", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Erreur lors de la récupération du roadtrip",
      });
  }
};

/* Mettre à jour un roadtrip complet */
const updateRoadtrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID roadtrip invalide" });
    }

    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === "") delete updateData[k];
    });

    if ("budget" in updateData) {
      updateData.budget = normalizeBudget(updateData.budget);
    }
    if ("duration" in updateData) {
      updateData.duration = Number(updateData.duration) || 0;
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTrip) {
      return res
        .status(404)
        .json({ success: false, message: "Roadtrip non trouvé" });
    }

    res.status(200).json({
      success: true,
      message: "Roadtrip mis à jour avec succès",
      trip: updatedTrip,
    });
  } catch (error) {
    logger.logError("Admin updateRoadtrip", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du roadtrip",
    });
  }
};

/* Créer un nouveau roadtrip */
const createRoadtrip = async (req, res) => {
  try {
    const tripData = {
      ...req.body,
      userId: req.user.userId,
    };

    if ("budget" in tripData) {
      tripData.budget = normalizeBudget(tripData.budget);
    }

    if ("duration" in tripData) {
      tripData.duration = Number(tripData.duration) || 0;
    }

    const newTrip = new Trip(tripData);
    await newTrip.save();

    res.status(201).json({
      success: true,
      message: "Roadtrip créé avec succès",
      trip: newTrip,
    });
  } catch (error) {
    logger.logError("Admin createRoadtrip", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du roadtrip",
    });
  }
};

/* Récupérer un utilisateur par ID pour édition */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(id).select(
      "-password -resetCode -verificationToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.logError("Admin getUserById", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'utilisateur",
    });
  }
};

/* Mettre à jour un utilisateur complet */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === "") {
        delete updateData[key];
      }
    });

    delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -resetCode -verificationToken");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    logger.logAuth("User updated by admin", updatedUser, {
      updatedBy: req.user.email,
    });

    res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      user: updatedUser,
    });
  } catch (error) {
    logger.logError("Admin updateUser", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de l'utilisateur",
    });
  }
};

module.exports = {
  getStats,
  getRecentUsers,
  getRecentRoadtrips,
  getUsers,
  getUserById,
  updateUser,
  getUserSubscription,
  updateUserStatus,
  deleteUser,
  getRoadtrips,
  getTripById,
  createRoadtrip,
  updateRoadtrip,
  updateRoadtripStatus,
  deleteTrip,
};

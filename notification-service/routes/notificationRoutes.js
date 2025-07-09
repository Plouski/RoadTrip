const express = require("express")
const router = express.Router()
const NotificationController = require("../controllers/notificationController")
const PushController = require("../controllers/pushController")
const verifyApiKey = require("../middlewares/verifyApiKey");

router.post("/email", NotificationController.sendEmail)
router.post("/sms", NotificationController.sendSMS)
router.post("/push/token", verifyApiKey, PushController.savePushToken);
router.post("/push/send", verifyApiKey, PushController.sendPushNotification);

module.exports = router
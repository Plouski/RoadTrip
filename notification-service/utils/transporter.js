require("dotenv").config();

const nodemailer = require("nodemailer");
const mailjetTransport = require("nodemailer-mailjet-transport");

if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
  throw new Error("❌ MAILJET_API_KEY ou MAILJET_API_SECRET manquant dans .env");
}

const transporter = nodemailer.createTransport(
  mailjetTransport({
    auth: {
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    },
  })
);

module.exports = transporter;
const transporter = require("../utils/transporter");
const dotenv = require("dotenv");
const confirmationTemplate = require("../templates/email/confirmation");
const resetTemplate = require("../templates/email/passwordReset");

dotenv.config();

const EmailService = {
  
  // Envoie un email de confirmation de compte avec un lien contenant le token
  sendConfirmationEmail: async (email, token) => {
    const link = `${process.env.FRONTEND_URL}/confirm-account?token=${token}`;
    const { subject, html } = confirmationTemplate(link);

    return transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject,
      html
    });
  },

  // Envoie un email pour la réinitialisation du mot de passe avec un code unique
  sendPasswordResetEmail: async (email, code) => {
    const { subject, html } = resetTemplate(code, email);

    return transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject,
      html
    });
  }

};

module.exports = EmailService;
const nodemailer = require("nodemailer");
const mailjetTransport = require("nodemailer-mailjet-transport");

if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
  console.warn("⚠️ Mailjet non configuré - emails simulés");
}

let transporter = null;

if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
  transporter = nodemailer.createTransport(
    mailjetTransport({
      auth: {
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_API_SECRET,
      },
    })
  );
  console.log("✅ Mailjet configuré - emails réels activés");
}

const createConfirmationEmail = (token) => {
  const link = `${process.env.FRONTEND_URL}/confirm-account?token=${token}`;
  
  return {
    subject: "Confirmez votre compte - ROADTRIP!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Bienvenue sur ROADTRIP!</h1>
        <p>Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
        <a href="${link}" style="background: #E30613; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirmer mon compte
        </a>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          Si le bouton ne fonctionne pas, copiez ce lien : ${link}
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Ce lien expire dans 24 heures.
        </p>
      </div>
    `
  };
};

const createResetEmail = (code) => {
  return {
    subject: "Code de réinitialisation - ROADTRIP!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Réinitialisation de mot de passe</h1>
        <p>Voici votre code de réinitialisation :</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #E30613;">
            ${code}
          </span>
        </div>
        <p style="color: #666;">Ce code expire dans 1 heure.</p>
        <p style="font-size: 12px; color: #999;">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
      </div>
    `
  };
};

const EmailService = {
  
  sendConfirmationEmail: async (email, token) => {
    if (!transporter) {
      throw new Error('Configuration Mailjet manquante');
    }

    console.log(`📧 Envoi email confirmation Mailjet à ${email}`);
    
    const { subject, html } = createConfirmationEmail(token);
    
    const result = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'ROADTRIP'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@roadtrip.fr'}>`,
      to: email,
      subject,
      html
    });

    console.log(`✅ Email confirmation Mailjet envoyé:`, result.messageId);
    return result;
  },

  sendPasswordResetEmail: async (email, code) => {
    if (!transporter) {
      throw new Error('Configuration Mailjet manquante');
    }

    console.log(`📧 Envoi email reset Mailjet à ${email}`);
    
    const { subject, html } = createResetEmail(code);
    
    const result = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'ROADTRIP'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@roadtrip.fr'}>`,
      to: email,
      subject,
      html
    });

    console.log(`✅ Email reset Mailjet envoyé:`, result.messageId);
    return result;
  }
};

module.exports = EmailService;
module.exports = (link, name = "", supportEmail = "support@roadtrip.fr") => ({
  subject: "Vérifie ton adresse email - ROADTRIP!",
  html: 
    `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vérifiez votre adresse e-mail</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: black;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 600px;
          margin: 30px auto;
          padding: 30px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .header {
          background: transparent;
          color: black;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }

        .header h1 {
          font-family: 'Trebuchet MS', sans-serif;
          font-size: 30px;
          margin: 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .content {
          padding: 20px 0;
          font-size: 17px;
          color: black;
        }

        .button {
          display: inline-block;
          background: #E30613;
          color: #ffffff;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          transition: 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          margin-top: 20px;
        }

        .button:hover {
          background: #be0511;
          transform: scale(1.05);
        }

        .footer {
          padding-top: 20px;
          font-size: 12px;
          color: black;
        }

        .footer a {
          color: black;
          text-decoration: underline;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
            <h1>Bienvenue à bord de ROADTRIP!</h1>
        </div>
        <div class="content">
            <p>Salut ${name},</p>
            <p>Merci de nous rejoindre pour ce voyage incroyable 🚗✨ ! Pour commencer l'aventure, vérifie ton e-mail en cliquant ci-dessous :</p>

            <a href="${link}" class="button">Confirmer mon e-mail</a>

            <p>Si le bouton ne fonctionne pas, copie et colle ce lien dans ton navigateur :</p>
            <p style="word-wrap: break-word; font-size: 14px;">${link}</p>

            <p>Ce lien est valide pendant 24 heures. Après ça, l'aventure reprend sans toi 😉</p>

            <p>Si tu n'as pas demandé de compte, pas de souci, ignore simplement cet e-mail.</p>

            <p>À bientôt sur la route !<br>L'équipe ROADTRIP! 🌍</p>
        </div>
        <div class="footer">
          <p>Des questions ? Contacte-nous à <a href="mailto:${supportEmail}">${supportEmail}</a></p>
          <p>&copy; ROADTRIP! 2025 - Let's hit the road!</p>
        </div>
      </div>
    </body>
  </html>`
});
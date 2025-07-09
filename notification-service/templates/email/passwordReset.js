module.exports = (code, email, supportEmail = "support@roadtrip.fr") => ({
  subject: "Code de réinitialisation de mot de passe - RoadTrip!",
  html: 
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe</title>
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

        .code-box {
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 20px;
          margin: 20px auto;
          max-width: 280px;
          border: 2px dashed #E30613;
        }

        .code {
          font-size: 34px;
          font-weight: bold;
          color: black;
          letter-spacing: 6px;
          font-family: 'Courier New', monospace;
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

        .link-text {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 8px;
          word-break: break-all;
          font-size: 14px;
          color: black;
          margin-top: 20px;
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
            <h1>Mot de passe oublié ?</h1>
        </div>
        <div class="content">
            <p>Hello voyageur ! 👋</p>
            <p>Pas de panique, on a tous des moments d'égarement. Voici ton code pour réinitialiser ton mot de passe :</p>

            <div class="code-box">
                <div class="code">${code}</div>
            </div>

            <p>⏱️ Ce code est valable pendant 1 heure seulement.</p>

            <p>Si tu n'as pas demandé à réinitialiser ton mot de passe, ignore simplement cet e-mail.</p>

            <p>Prêt à reprendre la route ?<br>L'équipe ROADTRIP! 🌍</p>
        </div>
        <div class="footer">
            <p>Des questions ? Contacte-nous à <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>&copy; ROADTRIP! 2025 - Let's hit the road!</p>
        </div>
      </div>
    </body>
  </html>`
});
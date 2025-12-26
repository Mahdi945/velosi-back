import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../services/email.service';
import { Organisation } from './entities/organisation.entity';

@Injectable()
export class EmailSetupService {
  private readonly logger = new Logger(EmailSetupService.name);

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async sendSetupInvitation(
    organisation: Organisation,
    setupToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
    const setupUrl = `${frontendUrl}/setup?token=${setupToken}`;

    this.logger.log(`📧 Préparation de l'email d'invitation pour ${organisation.nom} à ${organisation.email_contact}...`);
    
    const emailHtml = this.generateSetupEmailTemplate(organisation, setupUrl);

    try {
      await this.emailService.sendEmailWithLogimasterLogo(
        organisation.email_contact,
        `🎉 Bienvenue sur Shipnology ERP - Configurez votre espace ${organisation.nom}`,
        emailHtml,
      );
      
      this.logger.log(`✅ Email d'invitation envoyé avec succès à ${organisation.email_contact} pour ${organisation.nom}`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${organisation.email_contact}:`, error.message);
      throw new Error(`Impossible d'envoyer l'email d'invitation: ${error.message}`);
    }
  }

  private generateSetupEmailTemplate(organisation: Organisation, setupUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header img {
      background: white;
      padding: 15px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: white;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #2d3748;
      font-size: 22px;
      margin-bottom: 20px;
    }
    .content p {
      color: #4a5568;
      line-height: 1.8;
      font-size: 16px;
      margin-bottom: 20px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);    }
    .info-box {
      background: #ebf8ff;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .info-box p {
      margin: 0;
      color: #2c5282;
      font-size: 14px;
    }
    .footer {
      background: #f7fafc;
      padding: 30px;
      text-align: center;
      color: #718096;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:logo_logimaster" alt="Shipnology ERP" style="max-width: 180px; margin-bottom: 20px;" />
      <h1 style="color: white;"> Bienvenue sur Shipnology ERP</h1>
    </div>
    
    <div class="content">
      <h2>Bonjour ${organisation.nom} 👋</h2>
      
      <p>
        Félicitations ! Votre espace Shipnology ERP a été créé avec succès. 
        Nous sommes ravis de vous accueillir dans notre plateforme de gestion d'entreprise.
      </p>
      
      <p>
        Pour commencer à utiliser votre espace, vous devez compléter la configuration initiale 
        de votre organisation. Cette étape vous permettra de :
      </p>
      
      <ul style="color: #4a5568; line-height: 1.8;">
        <li>📝 Personnaliser les informations de votre entreprise</li>
        <li>🎨 Configurer votre logo et votre identité visuelle</li>
        <li>📧 Paramétrer vos emails sortants (SMTP)</li>
        <li>👥 Créer votre compte administrateur</li>
        <li>⚙️ Définir vos préférences système</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${setupUrl}" class="cta-button">
          🚀 Configurer mon espace maintenant
        </a>
      </div>
      
      <div class="info-box">
        <p><strong>⏰ Ce lien est valide pendant 24 heures</strong></p>
        <p>Pour des raisons de sécurité, ce lien d'invitation expire dans 24 heures. 
        Assurez-vous de configurer votre espace rapidement pour garantir un accès sécurisé.</p>
      </div>
      
      <p style="font-size: 14px; color: #718096; margin-top: 30px;">
        <strong>Besoin d'aide ?</strong> Notre équipe support est là pour vous accompagner. 
        N'hésitez pas à nous contacter à 
        <a href="mailto:support@shipnology-erp.com" style="color: #667eea;">support@shipnology-erp.com</a>
      </p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Shipnology ERP - Tous droits réservés</p>
      <p>
        <a href="#">Conditions d'utilisation</a> | 
        <a href="#">Politique de confidentialité</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

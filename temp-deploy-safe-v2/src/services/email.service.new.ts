import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Obtenir l'email expéditeur depuis les variables d'environnement
   */
  private getFromEmail(): string {
    return this.configService.get<string>('SMTP_FROM', this.configService.get<string>('SMTP_USER'));
  }

  /**
   * Obtenir le nom de l'expéditeur depuis les variables d'environnement
   */
  private getFromName(): string {
    return this.configService.get<string>('SMTP_FROM_NAME', 'Velosi ERP');
  }

  /**
   * Obtenir l'URL du logo (fonctionne en localhost et production)
   */
  private getLogoUrl(): string {
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    return `${backendUrl}/assets/logo_societee.png`;
  }

  private initializeTransporter() {
    try {
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASSWORD');
      
      if (!smtpUser || !smtpPass) {
        const warningMsg = '⚠️ SMTP_USER et SMTP_PASSWORD non définis - Service email désactivé';
        this.logger.warn(warningMsg);
        this.transporter = null;
        return;
      }
      
      const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
      const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
      const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
      
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort.toString()),
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log(`✅ Service email initialisé avec succès (${smtpUser} via ${smtpHost}:${smtpPort})`);
    } catch (error) {
      this.logger.error('❌ Erreur initialisation service email:', error);
      this.transporter = null;
      this.logger.warn('⚠️ Application démarrée sans service email');
    }
  }

  /**
   * Style CSS responsive commun pour tous les emails
   */
  private getResponsiveStyles(): string {
    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
          padding: 20px 10px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        
        .email-header {
          background: linear-gradient(135deg, #5e72e4 0%, #825ee4 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        
        .email-header.success {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }
        
        .email-header.warning {
          background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
        }
        
        .email-header.danger {
          background: linear-gradient(135deg, #fc8181 0%, #e53e3e 100%);
        }
        
        .logo-img {
          max-width: 180px;
          height: auto;
          margin-bottom: 15px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        .email-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 10px 0 5px 0;
        }
        
        .email-header p {
          font-size: 14px;
          opacity: 0.95;
          margin: 0;
        }
        
        .email-content {
          padding: 30px 20px;
        }
        
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
          color: #2d3748;
        }
        
        .otp-section {
          text-align: center;
          margin: 25px 0;
          padding: 25px 15px;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }
        
        .otp-label {
          font-size: 14px;
          color: #4a5568;
          margin-bottom: 12px;
          font-weight: 500;
        }
        
        .otp-code {
          display: inline-block;
          font-size: 32px;
          font-weight: 700;
          color: #5e72e4;
          background: #fff;
          padding: 15px 30px;
          border-radius: 10px;
          letter-spacing: 6px;
          border: 3px solid #5e72e4;
          box-shadow: 0 4px 15px rgba(94, 114, 228, 0.2);
        }
        
        .timer-info {
          margin-top: 15px;
          font-size: 13px;
          color: #e53e3e;
          font-weight: 500;
        }
        
        .info-box {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
          border-radius: 10px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .info-box.warning {
          background: #fef5e7;
          border-color: #f6ad55;
        }
        
        .info-box h3 {
          color: #22543d;
          font-size: 15px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .info-box.warning h3 {
          color: #c05621;
        }
        
        .info-box ul {
          margin-left: 18px;
          color: #2d3748;
        }
        
        .info-box li {
          margin-bottom: 6px;
          font-size: 13px;
        }
        
        .credentials-box {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        
        .credential-item {
          margin-bottom: 15px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .credential-label {
          font-size: 12px;
          color: #4a5568;
          font-weight: 500;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .credential-value {
          font-size: 16px;
          font-weight: 700;
          color: #2d3748;
          background: #f7fafc;
          padding: 10px 12px;
          border-radius: 6px;
          border: 2px dashed #cbd5e0;
          font-family: 'Courier New', monospace;
          word-break: break-all;
        }
        
        .email-footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 12px;
        }
        
        .email-footer p {
          margin: 5px 0;
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
          body {
            padding: 10px 5px;
          }
          
          .email-container {
            border-radius: 8px;
          }
          
          .email-header {
            padding: 25px 15px;
          }
          
          .email-header h1 {
            font-size: 20px;
          }
          
          .email-header p {
            font-size: 13px;
          }
          
          .logo-img {
            max-width: 150px;
          }
          
          .email-content {
            padding: 20px 15px;
          }
          
          .greeting {
            font-size: 15px;
          }
          
          .otp-section {
            padding: 20px 10px;
            margin: 20px 0;
          }
          
          .otp-code {
            font-size: 28px;
            padding: 12px 20px;
            letter-spacing: 4px;
          }
          
          .info-box {
            padding: 12px;
          }
          
          .info-box h3 {
            font-size: 14px;
          }
          
          .info-box li {
            font-size: 12px;
          }
          
          .credentials-box {
            padding: 15px;
          }
          
          .credential-item {
            padding: 12px;
          }
          
          .credential-value {
            font-size: 14px;
            padding: 8px 10px;
          }
          
          .email-footer {
            padding: 15px;
            font-size: 11px;
          }
        }
        
        @media only screen and (max-width: 400px) {
          .otp-code {
            font-size: 24px;
            padding: 10px 15px;
            letter-spacing: 3px;
          }
          
          .email-header h1 {
            font-size: 18px;
          }
        }
      </style>
    `;
  }

  /**
   * Footer simplifié et responsive
   */
  private getEmailFooter(): string {
    return `
      <div class="email-footer">
        <p style="font-weight: 500; margin-bottom: 8px;">
          © ${new Date().getFullYear()} Velosi ERP - Tous droits réservés
        </p>
        <p style="font-size: 11px;">
          Cet email a été envoyé automatiquement. Merci de ne pas répondre à cette adresse.
        </p>
      </div>
    `;
  }

  /**
   * Méthode générique pour envoyer un email
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(`⚠️ Impossible d'envoyer l'email à ${to}: Service email non configuré`);
        return false;
      }
      
      const mailOptions = {
        from: {
          name: this.getFromName(),
          address: this.getFromEmail()
        },
        to,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email envoyé avec succès à ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Envoyer un code OTP par email avec template responsive
   */
  async sendOtpEmail(email: string, otpCode: string, userName?: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(`⚠️ Impossible d'envoyer l'OTP à ${email}: Service email non configuré`);
        return false;
      }
      
      const htmlTemplate = this.getOtpEmailTemplate(otpCode, userName);
      
      const mailOptions = {
        from: {
          name: `${this.getFromName()} - Récupération de compte`,
          address: this.getFromEmail()
        },
        to: email,
        subject: `🔐 Code de récupération ${this.getFromName()}`,
        html: htmlTemplate,
        text: `Votre code de récupération Velosi ERP est: ${otpCode}. Ce code expire dans 10 minutes.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email OTP envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email OTP à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML responsive pour l'email OTP
   */
  private getOtpEmailTemplate(otpCode: string, userName?: string): string {
    const displayName = userName || 'Utilisateur';
    const logoUrl = this.getLogoUrl();
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Code de récupération Velosi ERP</title>
        ${this.getResponsiveStyles()}
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <img src="${logoUrl}" alt="Logo Velosi" class="logo-img" onerror="this.style.display='none'">
                <h1>🔐 Code de Récupération</h1>
                <p>Récupération sécurisée de votre compte</p>
            </div>
            
            <div class="email-content">
                <div class="greeting">
                    Bonjour <strong>${displayName}</strong>,
                </div>
                
                <p style="margin-bottom: 20px; color: #4a5568;">
                    Vous avez demandé la récupération de votre mot de passe pour votre compte <strong>Velosi ERP</strong>.
                </p>
                
                <div class="otp-section">
                    <div class="otp-label">Votre code de vérification :</div>
                    <div class="otp-code">${otpCode}</div>
                    <div class="timer-info">
                        ⏰ Ce code expire dans 10 minutes
                    </div>
                </div>
                
                <div class="info-box">
                    <h3>📋 Instructions :</h3>
                    <ul>
                        <li>Saisissez ce code dans la page de vérification</li>
                        <li>Le code est valide pendant <strong>10 minutes</strong></li>
                        <li>Après vérification, vous pourrez créer un nouveau mot de passe</li>
                        <li>Ce code ne peut être utilisé qu'une seule fois</li>
                    </ul>
                </div>
                
                <div class="info-box warning">
                    <h3>🛡️ Sécurité :</h3>
                    <ul>
                        <li><strong>Ne partagez jamais ce code</strong> avec qui que ce soit</li>
                        <li>Si vous n'avez pas demandé cette récupération, ignorez cet email</li>
                        <li>Contactez immédiatement votre administrateur en cas de doute</li>
                    </ul>
                </div>
            </div>
            
            ${this.getEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Envoyer notification de réinitialisation réussie
   */
  async sendPasswordResetSuccessEmail(email: string, userName?: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(`⚠️ Impossible d'envoyer la confirmation à ${email}: Service email non configuré`);
        return false;
      }
      
      const htmlTemplate = this.getSuccessEmailTemplate(userName);
      
      const mailOptions = {
        from: {
          name: `${this.getFromName()} - Sécurité`,
          address: this.getFromEmail()
        },
        to: email,
        subject: `✅ Mot de passe réinitialisé - ${this.getFromName()}`,
        html: htmlTemplate,
        text: `Votre mot de passe Velosi ERP a été réinitialisé avec succès.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email confirmation envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email confirmation à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML responsive pour confirmation de réinitialisation
   */
  private getSuccessEmailTemplate(userName?: string): string {
    const displayName = userName || 'Utilisateur';
    const logoUrl = this.getLogoUrl();
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Mot de passe réinitialisé - Velosi ERP</title>
        ${this.getResponsiveStyles()}
    </head>
    <body>
        <div class="email-container">
            <div class="email-header success">
                <img src="${logoUrl}" alt="Logo Velosi" class="logo-img" onerror="this.style.display='none'">
                <h1>✅ Réinitialisation Réussie</h1>
                <p>Votre mot de passe a été mis à jour</p>
            </div>
            
            <div class="email-content">
                <div class="greeting">
                    Bonjour <strong>${displayName}</strong>,
                </div>
                
                <p style="margin-bottom: 20px; color: #4a5568; text-align: center;">
                    Votre mot de passe <strong>Velosi ERP</strong> a été réinitialisé avec succès.
                </p>
                
                <div class="info-box">
                    <h3>✅ Confirmation :</h3>
                    <ul>
                        <li>Date : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</li>
                        <li>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe</li>
                        <li>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement votre administrateur</li>
                    </ul>
                </div>
                
                <div class="info-box warning">
                    <h3>🔒 Sécurité :</h3>
                    <ul>
                        <li>Utilisez un mot de passe unique et fort</li>
                        <li>Ne partagez jamais votre mot de passe</li>
                        <li>Activez l'authentification biométrique si disponible</li>
                    </ul>
                </div>
            </div>
            
            ${this.getEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Envoyer les informations de connexion au nouveau personnel
   */
  async sendPersonnelCredentialsEmail(
    email: string, 
    userName: string, 
    password: string, 
    fullName: string,
    role: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(`⚠️ Impossible d'envoyer les credentials à ${email}: Service email non configuré`);
        return false;
      }
      
      const htmlTemplate = this.getPersonnelCredentialsTemplate(userName, password, fullName, role);
      
      const mailOptions = {
        from: {
          name: `${this.getFromName()} - Bienvenue`,
          address: this.getFromEmail()
        },
        to: email,
        subject: `🎉 Bienvenue dans ${this.getFromName()} - Vos informations de connexion`,
        html: htmlTemplate,
        text: `Bienvenue ${fullName}! Vos informations de connexion Velosi ERP: Nom d'utilisateur: ${userName}, Mot de passe: ${password}. Veuillez changer votre mot de passe lors de votre première connexion.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email credentials personnel envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email credentials personnel à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML responsive pour les informations de connexion du personnel
   */
  private getPersonnelCredentialsTemplate(
    userName: string, 
    password: string, 
    fullName: string, 
    role: string
  ): string {
    const roleDisplayNames = {
      'commercial': 'Commercial',
      'admin': 'Administrateur',
      'manager': 'Manager',
      'employe': 'Employé'
    };
    
    const displayRole = roleDisplayNames[role] || role;
    const logoUrl = this.getLogoUrl();
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Bienvenue dans Velosi ERP</title>
        ${this.getResponsiveStyles()}
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <img src="${logoUrl}" alt="Logo Velosi" class="logo-img" onerror="this.style.display='none'">
                <h1>🎉 Bienvenue dans l'équipe !</h1>
                <p>Votre compte a été créé avec succès</p>
            </div>
            
            <div class="email-content">
                <div class="greeting" style="text-align: center;">
                    <strong style="font-size: 18px;">Bonjour ${fullName} !</strong>
                    <p style="color: #4a5568; margin-top: 10px;">
                        Nous sommes ravis de vous accueillir dans l'équipe Velosi.<br>
                        Rôle : <strong>${displayRole}</strong>
                    </p>
                </div>
                
                <div class="credentials-box">
                    <h3 style="text-align: center; color: #2d3748; margin-bottom: 15px;">
                        🔑 Vos informations de connexion
                    </h3>
                    
                    <div class="credential-item">
                        <div class="credential-label">Nom d'utilisateur</div>
                        <div class="credential-value">${userName}</div>
                    </div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Mot de passe temporaire</div>
                        <div class="credential-value">${password}</div>
                    </div>
                </div>
                
                <div class="info-box warning">
                    <h3>🚨 IMPORTANT - Sécurité</h3>
                    <ul>
                        <li><strong>Changez immédiatement votre mot de passe</strong> lors de votre première connexion</li>
                        <li>Ne partagez jamais vos informations de connexion</li>
                        <li>Utilisez un mot de passe fort (min. 8 caractères)</li>
                        <li>Déconnectez-vous toujours en fin de session</li>
                    </ul>
                </div>
                
                <div class="info-box">
                    <h3>📋 Première connexion</h3>
                    <ul>
                        <li>Rendez-vous sur le portail Velosi ERP</li>
                        <li>Utilisez les informations ci-dessus</li>
                        <li>Changez votre mot de passe</li>
                        <li>Complétez votre profil si nécessaire</li>
                    </ul>
                </div>
            </div>
            
            ${this.getEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Envoyer les informations de connexion au nouveau client
   */
  async sendClientCredentialsEmail(
    email: string, 
    userName: string, 
    password: string, 
    companyName: string,
    interlocuteur?: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(`⚠️ Impossible d'envoyer les credentials à ${email}: Service email non configuré`);
        return false;
      }
      
      const htmlTemplate = this.getClientCredentialsTemplate(userName, password, companyName, interlocuteur);
      
      const mailOptions = {
        from: {
          name: `${this.getFromName()} - Bienvenue Client`,
          address: this.getFromEmail()
        },
        to: email,
        subject: `🎉 Bienvenue chez ${this.getFromName()} - Accès client créé`,
        html: htmlTemplate,
        text: `Bienvenue ${companyName}! Votre accès client Velosi ERP: Nom d'utilisateur: ${userName}, Mot de passe: ${password}. Veuillez changer votre mot de passe lors de votre première connexion.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email credentials client envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email credentials client à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML responsive pour les informations de connexion du client
   */
  private getClientCredentialsTemplate(
    userName: string, 
    password: string, 
    companyName: string, 
    interlocuteur?: string
  ): string {
    const displayName = interlocuteur ? `${companyName} (${interlocuteur})` : companyName;
    const logoUrl = this.getLogoUrl();
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Bienvenue chez Velosi ERP</title>
        ${this.getResponsiveStyles()}
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <img src="${logoUrl}" alt="Logo Velosi" class="logo-img" onerror="this.style.display='none'">
                <h1>🎉 Bienvenue chez Velosi !</h1>
                <p>Votre accès client a été créé</p>
            </div>
            
            <div class="email-content">
                <div class="greeting" style="text-align: center;">
                    <strong style="font-size: 18px;">Bonjour ${displayName} !</strong>
                    <p style="color: #4a5568; margin-top: 10px;">
                        Nous sommes ravis de vous compter parmi nos clients.<br>
                        Votre accès au portail client est maintenant actif.
                    </p>
                </div>
                
                <div class="credentials-box">
                    <h3 style="text-align: center; color: #2d3748; margin-bottom: 15px;">
                        🔑 Vos informations de connexion
                    </h3>
                    
                    <div class="credential-item">
                        <div class="credential-label">Nom d'utilisateur</div>
                        <div class="credential-value">${userName}</div>
                    </div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Mot de passe temporaire</div>
                        <div class="credential-value">${password}</div>
                    </div>
                </div>
                
                <div class="info-box warning">
                    <h3>🚨 IMPORTANT - Sécurité</h3>
                    <ul>
                        <li><strong>Changez immédiatement votre mot de passe</strong> lors de votre première connexion</li>
                        <li>Ne partagez jamais vos informations de connexion</li>
                        <li>Utilisez un mot de passe fort</li>
                        <li>Déconnectez-vous toujours en fin de session</li>
                    </ul>
                </div>
                
                <div class="info-box">
                    <h3>📋 Première connexion</h3>
                    <ul>
                        <li>Rendez-vous sur le portail client Velosi ERP</li>
                        <li>Utilisez les informations ci-dessus</li>
                        <li>Changez votre mot de passe</li>
                        <li>Découvrez tous nos services disponibles</li>
                    </ul>
                </div>
            </div>
            
            ${this.getEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Vérifier la connexion email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn('⚠️ Service email non configuré');
        return false;
      }
      
      await this.transporter.verify();
      this.logger.log('✅ Connexion email vérifiée avec succès');
      return true;
    } catch (error) {
      this.logger.error('❌ Erreur vérification connexion email:', error);
      return false;
    }
  }
}

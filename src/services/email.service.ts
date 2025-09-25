import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Obtenir le chemin du logo de la société
   */
  private getLogoPath(): string | null {
    const possiblePaths = [
      path.join(process.cwd(), 'assets', 'logo_societee.png'),
      path.join(__dirname, '..', '..', 'assets', 'logo_societee.png'),
      path.join(__dirname, '..', 'assets', 'logo_societee.png'),
      path.join(__dirname, '../../../assets', 'logo_societee.png')
    ];
    
    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        this.logger.log(`✅ Logo trouvé à: ${logoPath}`);
        return logoPath;
      }
    }
    
    this.logger.warn('❌ Logo non trouvé dans tous les chemins possibles');
    return null;
  }

  /**
   * Obtenir le logo de la société en base64
   */
  private getCompanyLogoBase64(): string {
    try {
      // Chemins possibles pour le logo
      const possiblePaths = [
        path.join(process.cwd(), 'assets', 'logo_societee.png'),
        path.join(__dirname, '..', '..', 'assets', 'logo_societee.png'),
        path.join(__dirname, '..', 'assets', 'logo_societee.png'),
        path.join(__dirname, '../../../assets', 'logo_societee.png')
      ];
      
      for (const logoPath of possiblePaths) {
        this.logger.log(`Tentative de chargement du logo depuis: ${logoPath}`);
        
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          const logoBase64 = logoBuffer.toString('base64');
          const dataUri = `data:image/png;base64,${logoBase64}`;
          this.logger.log(`✅ Logo chargé avec succès depuis: ${logoPath} (${logoBuffer.length} bytes)`);
          this.logger.log(`📊 Base64 length: ${logoBase64.length}, DataURI length: ${dataUri.length}`);
          this.logger.log(`🔍 DataURI prefix: ${dataUri.substring(0, 100)}...`);
          return dataUri;
        } else {
          this.logger.warn(`❌ Logo non trouvé à: ${logoPath}`);
        }
      }
      
      this.logger.error('❌ Aucun logo trouvé dans tous les chemins possibles');
      return '';
    } catch (error) {
      this.logger.error('❌ Erreur lors du chargement du logo:', error);
      return '';
    }
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'velosierp@gmail.com',
          pass: 'qaas amak tyqq rzet', // Mot de passe d'application Gmail
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log('Service email initialisé avec succès');
    } catch (error) {
      this.logger.error('Erreur initialisation service email:', error);
    }
  }

  /**
   * Génère un footer simple et unifié pour tous les emails
   */
  private getSimpleEmailFooter(): string {
    return `
      <div class="footer" style="
        background-color: #f8f9fa;
        padding: 20px;
        text-align: center;
        border-top: 1px solid #e9ecef;
        margin-top: 30px;
        color: #6c757d;
        font-size: 12px;
        line-height: 1.4;
      ">
        <p style="margin: 0 0 8px 0; font-weight: 500;">
          © ${new Date().getFullYear()} Velosi ERP - Tous droits réservés
        </p>
        <p style="margin: 0; font-size: 11px;">
          Cet email a été envoyé automatiquement. Merci de ne pas répondre à cette adresse.
        </p>
      </div>
    `;
  }

  /**
   * Envoyer un code OTP par email
   */
  async sendOtpEmail(email: string, otpCode: string, userName?: string): Promise<boolean> {
    try {
      const htmlTemplate = this.getOtpEmailTemplate(otpCode, userName);
      
      // Préparer l'attachment du logo
      const logoPath = this.getLogoPath();
      const attachments = [];
      
      if (logoPath && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo_velosi.png',
          path: logoPath,
          cid: 'logo_velosi' // Content-ID pour référencer dans le HTML
        });
      }
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Récupération de compte',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '🔐 Code de récupération Velosi ERP',
        html: htmlTemplate,
        text: `Votre code de récupération Velosi ERP est: ${otpCode}. Ce code expire dans 10 minutes.`,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email OTP envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi email OTP à ${email}:`, error);
      return false;
    }
  }

  /**
   * Envoyer notification de réinitialisation réussie
   */
  async sendPasswordResetSuccessEmail(email: string, userName?: string): Promise<boolean> {
    try {
      const htmlTemplate = this.getSuccessEmailTemplate(userName);
      
      // Préparer l'attachment du logo
      const logoPath = this.getLogoPath();
      const attachments = [];
      
      if (logoPath && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo_velosi.png',
          path: logoPath,
          cid: 'logo_velosi' // Content-ID pour référencer dans le HTML
        });
      }
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Sécurité',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '✅ Mot de passe réinitialisé - Velosi ERP',
        html: htmlTemplate,
        text: `Votre mot de passe Velosi ERP a été réinitialisé avec succès.`,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email confirmation envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi email confirmation à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML pour l'email OTP
   */
  private getOtpEmailTemplate(otpCode: string, userName?: string): string {
    const displayName = userName || 'Utilisateur';
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de récupération Velosi ERP</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #5e72e4 0%, #825ee4 100%);
                padding: 30px;
                text-align: center;
                color: white;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="rgba(255,255,255,0.1)"><polygon points="0,100 0,0 500,100 1000,0 1000,100"/></svg>');
                background-size: cover;
            }
            
            .logo-fallback {
                width: 120px;
                height: 60px;
                background: #fff;
                border-radius: 12px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 18px;
                color: #5e72e4;
                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 10px;
                position: relative;
                z-index: 2;
            }
            
            .header p {
                font-size: 16px;
                opacity: 0.9;
                position: relative;
                z-index: 2;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .greeting {
                font-size: 18px;
                margin-bottom: 25px;
                color: #2d3748;
            }
            
            .otp-section {
                text-align: center;
                margin: 35px 0;
                padding: 30px;
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                border-radius: 16px;
                border: 2px solid #e2e8f0;
            }
            
            .otp-label {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 15px;
                font-weight: 500;
            }
            
            .otp-code {
                display: inline-block;
                font-size: 36px;
                font-weight: 700;
                color: #5e72e4;
                background: #fff;
                padding: 20px 40px;
                border-radius: 12px;
                letter-spacing: 8px;
                border: 3px solid #5e72e4;
                box-shadow: 0 8px 25px rgba(94, 114, 228, 0.2);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .timer-info {
                margin-top: 20px;
                font-size: 14px;
                color: #e53e3e;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .timer-icon {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #e53e3e;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
            }
            
            .instructions {
                background: #f0fff4;
                border: 1px solid #9ae6b4;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
            }
            
            .instructions h3 {
                color: #22543d;
                font-size: 16px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .instructions ul {
                margin-left: 20px;
                color: #2d3748;
            }
            
            .instructions li {
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            .security-warning {
                background: #fef5e7;
                border: 1px solid #f6ad55;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
            }
            
            .security-warning h3 {
                color: #c05621;
                font-size: 16px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .security-warning p {
                color: #2d3748;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            
            .footer p {
                color: #6c757d;
                font-size: 12px;
                margin-bottom: 5px;
            }
            
            .contact-info {
                margin-top: 20px;
                padding: 15px;
                background: #fff;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            
            .contact-info h4 {
                color: #2d3748;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .contact-info p {
                color: #4a5568;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_velosi" alt="Logo Velosi" width="200" height="auto" />
                <h1>🔐 Code de Récupération</h1>
                <p>Récupération sécurisée de votre compte ERP</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Bonjour <strong>${displayName}</strong>,
                </div>
                
                <p>Vous avez demandé la récupération de votre mot de passe pour votre compte <strong>Velosi ERP</strong>.</p>
                
                <div class="otp-section">
                    <div class="otp-label">Votre code de vérification :</div>
                    <div class="otp-code">${otpCode}</div>
                    <div class="timer-info">
                         
                        Ce code expire dans 10 minutes
                    </div>
                </div>
                
                <div class="instructions">
                    <h3>📋 Instructions :</h3>
                    <ul>
                        <li>Saisissez ce code dans la page de vérification</li>
                        <li>Le code est valide pendant <strong>10 minutes</strong></li>
                        <li>Après vérification, vous pourrez créer un nouveau mot de passe</li>
                        <li>Ce code ne peut être utilisé qu'une seule fois</li>
                    </ul>
                </div>
                
                <div class="security-warning">
                    <h3>🛡️ Sécurité :</h3>
                    <p><strong>Ne partagez jamais ce code</strong> avec qui que ce soit.</p>
                    <p>Si vous n'avez pas demandé cette récupération, ignorez cet email et contactez immédiatement votre administrateur.</p>
                    <p>Velosi ne vous demandera jamais votre code par téléphone ou email.</p>
                </div>
                
                <p style="margin-top: 30px; color: #4a5568;">
                    Si vous avez des questions, notre équipe technique est à votre disposition.
                </p>
            </div>
            
            ${this.getSimpleEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML pour la confirmation de réinitialisation
   */
  private getSuccessEmailTemplate(userName?: string): string {
    const displayName = userName || 'Utilisateur';
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mot de passe réinitialisé - Velosi ERP</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            body {
                font-family: 'Inter', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                padding: 20px;
                margin: 0;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                padding: 30px;
                text-align: center;
                color: white;
            }
            
            .logo-fallback {
                width: 120px;
                height: 60px;
                background: #fff;
                border-radius: 12px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 18px;
                color: #48bb78;
                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            }
            
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            
            .success-icon {
                width: 80px;
                height: 80px;
                background: #48bb78;
                border-radius: 50%;
                margin: 0 auto 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: white;
                animation: bounce 1s infinite alternate;
            }
            
            @keyframes bounce {
                from { transform: translateY(0px); }
                to { transform: translateY(-10px); }
            }
            
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_velosi" alt="Logo Velosi" width="200" height="auto" />
                <h1>✅ Réinitialisation Réussie</h1>
            </div>
            
            <div class="content">
                
                <h2>Mot de passe réinitialisé avec succès !</h2>
                <p>Bonjour <strong>${displayName}</strong>,</p>
                <p>Votre mot de passe Velosi ERP a été réinitialisé avec succès le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.</p>
                <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            </div>
            
            ${this.getSimpleEmailFooter()}
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
      await this.transporter.verify();
      this.logger.log('Connexion email vérifiée avec succès');
      return true;
    } catch (error) {
      this.logger.error('Erreur vérification connexion email:', error);
      return false;
    }
  }

  /**
   * Méthode alternative: utiliser l'URL publique du logo
   */
  async sendOtpEmailWithPublicLogo(email: string, otpCode: string, userName?: string): Promise<boolean> {
    try {
      const htmlTemplate = this.getOtpEmailTemplateWithUrl(otpCode, userName);
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Récupération de compte',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '🔐 Code de récupération Velosi ERP (URL)',
        html: htmlTemplate,
        text: `Votre code de récupération Velosi ERP est: ${otpCode}. Ce code expire dans 10 minutes.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email OTP (URL publique) envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi email OTP (URL publique) à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template avec URL publique du logo
   */
  private getOtpEmailTemplateWithUrl(otpCode: string, userName?: string): string {
    const displayName = userName || 'Utilisateur';
    const logoUrl = 'http://localhost:3000/assets/logo_societee.png'; // URL publique
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de récupération Velosi ERP</title>
    </head>
    <body style="font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="${logoUrl}" alt="Logo Velosi" width="200" height="auto" style="display: block; margin: 0 auto;" />
                <h1 style="color: #333; margin: 20px 0;">🔐 Code de Récupération</h1>
                <p style="color: #666;">Récupération sécurisée de votre compte ERP</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Bonjour <strong>${displayName}</strong>,</p>
                <p>Vous avez demandé la récupération de votre mot de passe pour votre compte <strong>Velosi ERP</strong>.</p>
                
                <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <p style="margin-bottom: 10px;">Votre code de vérification :</p>
                    <div style="font-size: 36px; font-weight: bold; color: #5e72e4; padding: 15px; background: white; border-radius: 8px; display: inline-block; letter-spacing: 4px;">
                        ${otpCode}
                    </div>
                    <p style="color: #e53e3e; margin-top: 15px; font-size: 14px;">
                        ⏰ Ce code expire dans 10 minutes
                    </p>
                </div>
                
                <p style="margin-top: 20px; color: #666;">
                    Si vous n'avez pas demandé cette récupération, ignorez cet email.
                </p>
            </div>
            
            ${this.getSimpleEmailFooter()}
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
      const htmlTemplate = this.getPersonnelCredentialsTemplate(userName, password, fullName, role);
      
      // Préparer l'attachment du logo
      const logoPath = this.getLogoPath();
      const attachments = [];
      
      if (logoPath && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo_velosi.png',
          path: logoPath,
          cid: 'logo_velosi' // Content-ID pour référencer dans le HTML
        });
      }
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Bienvenue',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '🎉 Bienvenue dans Velosi ERP - Vos informations de connexion',
        html: htmlTemplate,
        text: `Bienvenue ${fullName}! Vos informations de connexion Velosi ERP: Nom d'utilisateur: ${userName}, Mot de passe: ${password}. Veuillez changer votre mot de passe lors de votre première connexion.`,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email informations personnel envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi email informations personnel à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML pour les informations de connexion du personnel
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
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue dans Velosi ERP</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                padding: 20px;
            }
            
            .container {
                max-width: 650px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="rgba(255,255,255,0.1)"><polygon points="0,100 0,0 500,100 1000,0 1000,100"/></svg>');
                background-size: cover;
            }
            
            .header h1 {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                position: relative;
                z-index: 2;
            }
            
            .header p {
                font-size: 18px;
                opacity: 0.95;
                position: relative;
                z-index: 2;
            }
            
            .welcome-icon {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                position: relative;
                z-index: 2;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .greeting {
                text-align: center;
                margin-bottom: 35px;
            }
            
            .greeting h2 {
                font-size: 28px;
                color: #1a202c;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .greeting p {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 8px;
            }
            
            .role-badge {
                display: inline-block;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                color: white;
                padding: 8px 20px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 14px;
                margin-top: 10px;
            }
            
            .credentials-section {
                background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
                border: 2px solid #e2e8f0;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                position: relative;
            }
            
            .credentials-title {
                text-align: center;
                font-size: 20px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 25px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .credential-item {
                margin-bottom: 20px;
                padding: 20px;
                background: white;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            
            .credential-label {
                font-size: 14px;
                color: #4a5568;
                font-weight: 500;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .credential-value {
                font-size: 18px;
                font-weight: 700;
                color: #2d3748;
                background: #f7fafc;
                padding: 12px 16px;
                border-radius: 8px;
                border: 2px dashed #cbd5e0;
                font-family: 'Courier New', monospace;
                word-break: break-all;
            }
            
            .security-alert {
                background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
                border: 2px solid #fc8181;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                position: relative;
            }
            
            .security-alert::before {
                content: '🔒';
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                background: #e53e3e;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            
            .security-alert h3 {
                color: #c53030;
                font-size: 18px;
                margin-bottom: 15px;
                text-align: center;
                font-weight: 600;
            }
            
            .security-alert ul {
                color: #2d3748;
                margin-left: 20px;
            }
            
            .security-alert li {
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .instructions {
                background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
                border: 2px solid #4fd1c7;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
            }
            
            .instructions h3 {
                color: #234e52;
                font-size: 18px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .instructions ol {
                margin-left: 20px;
                color: #2d3748;
            }
            
            .instructions li {
                margin-bottom: 10px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .contact-section {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            
            .contact-section h3 {
                color: #2d3748;
                font-size: 18px;
                margin-bottom: 15px;
            }
            
            .contact-section p {
                color: #4a5568;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .footer {
                
                padding: 30px;
                text-align: center;
                color: white;
            }
            
            .footer p {
                margin-bottom: 8px;
                opacity: 0.9;
            }
            
            .footer .company-info {
                font-size: 14px;
                font-weight: 600;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_velosi" alt="Logo Velosi" width="200" height="auto" />
              
                <h1>Bienvenue dans Velosi ERP !</h1>
                <p>Votre compte a été créé avec succès</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    <h2>Bonjour ${fullName} !</h2>
                    <p>Nous sommes ravis de vous accueillir dans l'équipe Velosi.</p>
                    <p>Votre compte a été créé en tant que :</p>
                    <div class="role-badge">${displayRole}</div>
                </div>
                
                <div class="credentials-section">
                    <div class="credentials-title">
                        🔑 Vos informations de connexion
                    </div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Nom d'utilisateur</div>
                        <div class="credential-value">${userName}</div>
                    </div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Mot de passe temporaire</div>
                        <div class="credential-value">${password}</div>
                    </div>
                </div>
                
                <div class="security-alert">
                    <h3>🚨 IMPORTANT - Sécurité</h3>
                    <ul>
                        <li><strong>Changez immédiatement votre mot de passe</strong> lors de votre première connexion</li>
                        <li>Ne partagez jamais vos informations de connexion</li>
                        <li>Utilisez un mot de passe fort (min. 8 caractères, majuscules, minuscules, chiffres)</li>
                        <li>Déconnectez-vous toujours en fin de session</li>
                    </ul>
                </div>
                
                <div class="instructions">
                    <h3>📋 Première connexion</h3>
                    <ol>
                        <li>Rendez-vous sur le portail Velosi ERP</li>
                        <li>Utilisez les informations ci-dessus pour vous connecter</li>
                        <li>Le système vous demandera de changer votre mot de passe</li>
                        <li>Complétez votre profil si nécessaire</li>
                        <li>Explorez votre nouvel environnement de travail !</li>
                    </ol>
                </div>
                
                <div class="contact-section">
                    <h3>💬 Besoin d'aide ?</h3>
                    <p><strong>Support IT Velosi</strong></p>
                    <p>📧 Email: support.it@velosi.com</p>
                    <p>📞 Téléphone: +33 (0)1 23 45 67 89</p>
                    <p>🕒 Disponible du lundi au vendredi, 8h30 - 18h00</p>
                </div>
            </div>
            
            <div class="footer">
            
                <p style="font-size: 12px; margin-top: 20px;">
                    © ${new Date().getFullYear()} Velosi ERP. Tous droits réservés.<br>
                    Cet email contient des informations confidentielles.
                </p>
            ${this.getSimpleEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Envoyer notification de désactivation/suspension
   */
  async sendPersonnelDeactivationEmail(
    email: string, 
    fullName: string, 
    action: 'desactive' | 'suspendu', 
    reason: string
  ): Promise<boolean> {
    try {
      const htmlTemplate = this.getDeactivationEmailTemplate(fullName, action, reason);
      
      // Préparer l'attachment du logo
      const logoPath = this.getLogoPath();
      const attachments = [];
      
      if (logoPath && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo_velosi.png',
          path: logoPath,
          cid: 'logo_velosi'
        });
      }
      
      const actionText = action === 'desactive' ? 'désactivé' : 'suspendu';
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Gestion RH',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: `⚠️ Compte ${actionText} - Velosi ERP`,
        html: htmlTemplate,
        text: `Votre compte Velosi ERP a été ${actionText}. Raison: ${reason}. Contactez votre administrateur pour plus d'informations.`,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de ${action} envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi email ${action} à ${email}:`, error);
      return false;
    }
  }

  /**
   * Envoyer notification de réactivation
   */
  async sendPersonnelReactivationEmail(
    email: string, 
    fullName: string
  ): Promise<boolean> {
    try {
      const htmlTemplate = this.getReactivationEmailTemplate(fullName);
      
      // Préparer l'attachment du logo
      const logoPath = this.getLogoPath();
      const attachments = [];
      
      if (logoPath && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo_velosi.png',
          path: logoPath,
          cid: 'logo_velosi'
        });
      }
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Gestion RH',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '✅ Compte réactivé - Velosi ERP',
        html: htmlTemplate,
        text: `Bonne nouvelle ! Votre compte Velosi ERP a été réactivé. Vous pouvez maintenant vous reconnecter normalement.`,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de réactivation envoyé avec succès à ${email} - ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi email réactivation à ${email}:`, error);
      return false;
    }
  }

  /**
   * Template HTML pour la désactivation/suspension
   */
  private getDeactivationEmailTemplate(
    fullName: string, 
    action: 'desactive' | 'suspendu', 
    reason: string
  ): string {
    const actionText = action === 'desactive' ? 'désactivé' : 'suspendu';
    const actionColor = action === 'desactive' ? '#e53e3e' : '#d69e2e';
    const actionIcon = action === 'desactive' ? '🚫' : '⏸️';
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compte ${actionText} - Velosi ERP</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, ${actionColor} 0%, #2d3748 100%);
                padding: 20px;
            }
            
            .container {
                max-width: 650px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, ${actionColor} 0%, #2d3748 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
                position: relative;
            }
            
            .header h1 {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                position: relative;
                z-index: 2;
            }
            
            .header p {
                font-size: 18px;
                opacity: 0.95;
                position: relative;
                z-index: 2;
            }
            
            .status-icon {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                position: relative;
                z-index: 2;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .notification {
                text-align: center;
                margin-bottom: 35px;
            }
            
            .notification h2 {
                font-size: 28px;
                color: #1a202c;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .notification p {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 8px;
            }
            
            .status-badge {
                display: inline-block;
                background: ${actionColor};
                color: white;
                padding: 10px 25px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 16px;
                margin-top: 15px;
                text-transform: uppercase;
            }
            
            .reason-section {
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                border: 2px solid #e2e8f0;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
            }
            
            .reason-title {
                font-size: 18px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .reason-text {
                background: white;
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                font-size: 16px;
                line-height: 1.6;
                color: #2d3748;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            
            .admin-info {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                text-align: center;
            }
            
            .admin-info p {
                color: #4a5568;
                font-size: 14px;
                margin-bottom: 5px;
            }
            
            .contact-section {
                background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
                border: 2px solid #4fd1c7;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                text-align: center;
            }
            
            .contact-section h3 {
                color: #234e52;
                font-size: 18px;
                margin-bottom: 15px;
            }
            
            .contact-section p {
                color: #2d3748;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #6c757d;
            }
            
            .footer p {
                margin-bottom: 8px;
                opacity: 0.9;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_velosi" alt="Logo Velosi" width="200" height="auto" />
             
                <h1>Compte ${actionText}</h1>
                <p>Notification importante concernant votre accès</p>
            </div>
            
            <div class="content">
                <div class="notification">
                    <h2>Bonjour ${fullName}</h2>
                    <p>Nous vous informons que votre compte Velosi ERP a été ${actionText}.</p>
                    <div class="status-badge">Compte ${actionText}</div>
                </div>
                
                <div class="reason-section">
                    <div class="reason-title">
                        📝 Motif de cette action
                    </div>
                    <div class="reason-text">
                        ${reason}
                    </div>
                </div>
                
                <div class="admin-info">
                    <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                </div>
                
                <div class="contact-section">
                    <h3>💬 Besoin d'informations ?</h3>
                    <p><strong>Service RH Velosi</strong></p>
                    <p>📧 Email: rh@velosi.com</p>
                    <p>📞 Téléphone: +33 (0)1 23 45 67 89</p>
                    <p>🕒 Disponible du lundi au vendredi, 8h30 - 18h00</p>
                    <p style="margin-top: 15px; font-weight: 600;">
                        Pour toute question concernant cette décision, n'hésitez pas à nous contacter.
                    </p>
                </div>
            </div>
            
            ${this.getSimpleEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML pour la réactivation
   */
  private getReactivationEmailTemplate(fullName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compte réactivé - Velosi ERP</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                padding: 20px;
            }
            
            .container {
                max-width: 650px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
                position: relative;
            }
            
            .header h1 {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                position: relative;
                z-index: 2;
            }
            
            .header p {
                font-size: 18px;
                opacity: 0.95;
                position: relative;
                z-index: 2;
            }
            
            .success-icon {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                position: relative;
                z-index: 2;
                animation: bounce 2s infinite;
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .notification {
                text-align: center;
                margin-bottom: 35px;
            }
            
            .notification h2 {
                font-size: 28px;
                color: #1a202c;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .notification p {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 10px;
            }
            
            .status-badge {
                display: inline-block;
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                color: white;
                padding: 12px 30px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 16px;
                margin-top: 15px;
                text-transform: uppercase;
                box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
            }
            
            .instructions {
                background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
                border: 2px solid #68d391;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
            }
            
            .instructions h3 {
                color: #22543d;
                font-size: 18px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .instructions ul {
                margin-left: 20px;
                color: #2d3748;
            }
            
            .instructions li {
                margin-bottom: 10px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .admin-info {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                text-align: center;
            }
            
            .admin-info p {
                color: #4a5568;
                font-size: 14px;
                margin-bottom: 5px;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #6c757d;
            }
            
            .footer p {
                margin-bottom: 8px;
                opacity: 0.9;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_velosi" alt="Logo Velosi" width="200" height="auto" />
                
                <h1>Compte Réactivé !</h1>
                <p>Bienvenue de retour dans l'équipe</p>
            </div>
            
            <div class="content">
                <div class="notification">
                    <h2>Excellente nouvelle ${fullName} !</h2>
                    <p>Votre compte Velosi ERP a été réactivé avec succès.</p>
                    <p>Vous pouvez maintenant accéder à nouveau à tous vos services.</p>
                    <div class="status-badge">✅ Compte Actif</div>
                </div>
                
                <div class="instructions">
                    <h3>🔑 Prochaines étapes</h3>
                    <ul>
                        <li>Vous pouvez vous connecter immédiatement avec vos identifiants habituels</li>
                        <li>Toutes vos données et configurations ont été préservées</li>
                        <li>En cas de problème de connexion, contactez le support IT</li>
                        <li>Nous vous recommandons de changer votre mot de passe par sécurité</li>
                    </ul>
                </div>
                
                <div class="admin-info">
                    <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0; padding: 20px; background: #e6fffa; border-radius: 12px;">
                    <h3 style="color: #234e52; margin-bottom: 10px;">🚀 Bon retour parmi nous !</h3>
                    <p style="color: #2d3748; font-size: 16px;">
                        L'équipe Velosi vous souhaite une excellente reprise.
                    </p>
                </div>
            </div>
            
            ${this.getSimpleEmailFooter()}
        </div>
    </body>
    </html>
    `;
  }


}
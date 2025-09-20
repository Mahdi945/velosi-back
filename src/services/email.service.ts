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

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'mahdibey2002@gmail.com',
          pass: 'emmv krph yucn enub', // Mot de passe d'application Gmail
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
   * Envoyer un code OTP par email
   */
  async sendOtpEmail(email: string, otpCode: string, userName?: string): Promise<boolean> {
    try {
      const htmlTemplate = this.getOtpEmailTemplate(otpCode, userName);
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Récupération de compte',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '🔐 Code de récupération Velosi ERP',
        html: htmlTemplate,
        text: `Votre code de récupération Velosi ERP est: ${otpCode}. Ce code expire dans 10 minutes.`,
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
      
      const mailOptions = {
        from: {
          name: 'Velosi ERP - Sécurité',
          address: 'mahdibey2002@gmail.com'
        },
        to: email,
        subject: '✅ Mot de passe réinitialisé - Velosi ERP',
        html: htmlTemplate,
        text: `Votre mot de passe Velosi ERP a été réinitialisé avec succès.`,
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
            
            .logo {
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
                position: relative;
                z-index: 2;
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
                <div class="logo">VELOSI</div>
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
                        <div class="timer-icon">!</div>
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
            
            <div class="footer">
                <div class="contact-info">
                    <h4>📞 Support Technique Velosi</h4>
                    <p><strong>Transport & Logistique</strong></p>
                    <p>Email: support@velosi.com | Tél: +33 (0)1 23 45 67 89</p>
                    <p>Disponible 24h/24, 7j/7 pour votre sécurité</p>
                </div>
                
                <p style="margin-top: 20px;">© ${new Date().getFullYear()} Velosi ERP. Tous droits réservés.</p>
                <p>Votre partenaire de confiance en Transport & Logistique</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
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
            
            .logo {
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
                <div class="logo">VELOSI</div>
                <h1>✅ Réinitialisation Réussie</h1>
            </div>
            
            <div class="content">
                <div class="success-icon">✓</div>
                <h2>Mot de passe réinitialisé avec succès !</h2>
                <p>Bonjour <strong>${displayName}</strong>,</p>
                <p>Votre mot de passe Velosi ERP a été réinitialisé avec succès le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.</p>
                <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} Velosi ERP. Tous droits réservés.</p>
            </div>
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
}
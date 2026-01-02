import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Organisation } from '../entities/organisation.entity';

/**
 * Service Email Multi-Tenant
 * 
 * Fonctionnalités:
 * - Configuration SMTP personnalisée par organisation
 * - Fallback sur configuration globale si non configuré
 * - Support de plusieurs providers (Gmail, Infomaniak, SendGrid, etc.)
 */
@Injectable()
export class MultiTenantEmailService {
  private readonly logger = new Logger(MultiTenantEmailService.name);
  private globalTransporter: nodemailer.Transporter;
  private organisationTransporters: Map<number, nodemailer.Transporter> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeGlobalTransporter();
  }

  /**
   * Initialiser le transporter SMTP global (fallback)
   */
  private initializeGlobalTransporter() {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: parseInt(this.configService.get<string>('SMTP_PORT', '587')),
      secure: this.configService.get<string>('SMTP_PORT') === '465',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false, // Pour les certificats auto-signés
      },
    };

    this.globalTransporter = nodemailer.createTransport(smtpConfig);
    
    this.logger.log(`✅ Transporter SMTP global initialisé: ${smtpConfig.host}:${smtpConfig.port}`);
  }

  /**
   * Obtenir ou créer un transporter pour une organisation
   * 
   * @param organisation - L'organisation
   * @returns Transporter SMTP (personnalisé ou global)
   */
  private getTransporterForOrganisation(organisation: Organisation): nodemailer.Transporter {
    // Si l'organisation n'a pas activé sa config SMTP, utiliser le global
    if (!organisation.smtp_enabled || !organisation.smtp_host) {
      this.logger.log(`Organisation "${organisation.nom}" utilise le SMTP global`);
      return this.globalTransporter;
    }

    // Vérifier si un transporter existe déjà en cache
    if (this.organisationTransporters.has(organisation.id)) {
      return this.organisationTransporters.get(organisation.id);
    }

    // Créer un nouveau transporter personnalisé
    this.logger.log(`Création d'un transporter SMTP pour: ${organisation.nom}`);

    const customTransporter = nodemailer.createTransport({
      host: organisation.smtp_host,
      port: organisation.smtp_port || 587,
      secure: organisation.smtp_port === 465, // true pour port 465, false pour les autres
      auth: {
        user: organisation.smtp_user,
        pass: this.decryptPassword(organisation.smtp_password), // Décrypter si nécessaire
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Mettre en cache
    this.organisationTransporters.set(organisation.id, customTransporter);

    this.logger.log(`✅ Transporter créé: ${organisation.smtp_host}:${organisation.smtp_port}`);

    return customTransporter;
  }

  /**
   * Envoyer un email avec la configuration de l'organisation
   * 
   * @param organisation - L'organisation émettrice
   * @param to - Destinataire(s)
   * @param subject - Sujet de l'email
   * @param html - Contenu HTML
   * @param attachments - Pièces jointes (optionnel)
   */
  async sendEmailForOrganisation(
    organisation: Organisation,
    to: string | string[],
    subject: string,
    html: string,
    attachments?: Array<{ filename?: string; content?: any; path?: string; contentType?: string; cid?: string }>
  ): Promise<void> {
    try {
      const transporter = this.getTransporterForOrganisation(organisation);

      // Déterminer l'email expéditeur
      const fromEmail = organisation.smtp_enabled && organisation.smtp_from_email
        ? organisation.smtp_from_email
        : this.configService.get<string>('SMTP_FROM', this.configService.get<string>('SMTP_USER'));

      // Déterminer le nom expéditeur
      const fromName = organisation.smtp_enabled && organisation.smtp_from_name
        ? organisation.smtp_from_name
        : organisation.nom_affichage || organisation.nom;

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);

      this.logger.log(`✅ Email envoyé à ${to} depuis ${fromEmail} (MessageID: ${info.messageId})`);
    } catch (error) {
      this.logger.error(`❌ Échec envoi email pour ${organisation.nom}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un email de bienvenue au superviseur d'une nouvelle organisation
   */
  async sendWelcomeEmail(
    organisation: Organisation,
    superviseurEmail: string,
    superviseurNom: string,
    temporaryPassword: string
  ): Promise<void> {
    const subject = `Bienvenue sur ${organisation.nom_affichage || organisation.nom}`;

    const html = this.generateWelcomeEmailTemplate(
      organisation,
      superviseurNom,
      temporaryPassword
    );

    await this.sendEmailForOrganisation(organisation, superviseurEmail, subject, html);
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    organisation: Organisation,
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<void> {
    const subject = 'Réinitialisation de votre mot de passe';

    const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}&org=${organisation.slug}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Réinitialisation de mot de passe</h2>
          
          <p>Bonjour ${userName},</p>
          
          <p>Vous avez demandé une réinitialisation de votre mot de passe pour <strong>${organisation.nom_affichage || organisation.nom}</strong>.</p>
          
          <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          
          <p style="color: #7f8c8d; font-size: 14px;">
            Ce lien est valide pendant 1 heure.<br>
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
          
          <p style="color: #95a5a6; font-size: 12px;">
            ${organisation.nom}<br>
            ${organisation.email_contact}
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmailForOrganisation(organisation, userEmail, subject, html);
  }

  /**
   * Template email de bienvenue
   */
  private generateWelcomeEmailTemplate(
    organisation: Organisation,
    superviseurNom: string,
    temporaryPassword: string
  ): string {
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login?org=${organisation.slug}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
          ${organisation.logo_url ? `
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${organisation.logo_url}" alt="${organisation.nom}" style="max-width: 200px; height: auto;">
            </div>
          ` : ''}
          
          <h1 style="color: #2c3e50; text-align: center;">Bienvenue sur Velosi ERP !</h1>
          
          <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <p>Bonjour <strong>${superviseurNom}</strong>,</p>
            
            <p>Votre organisation <strong>${organisation.nom}</strong> a été créée avec succès !</p>
            
            <p>Vous êtes maintenant le <strong>superviseur principal</strong> de votre espace.</p>
            
            <h3 style="color: #3498db; margin-top: 30px;">Vos identifiants de connexion</h3>
            
            <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Organisation :</strong> ${organisation.slug}</p>
              <p style="margin: 5px 0;"><strong>Email :</strong> ${this.configService.get('SUPERVISOR_EMAIL', 'non défini')}</p>
              <p style="margin: 5px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px;">${temporaryPassword}</code></p>
            </div>
            
            <p style="color: #e74c3c; font-weight: bold;">⚠️ Important : Changez ce mot de passe dès votre première connexion.</p>
            
            <p style="text-align: center; margin: 40px 0;">
              <a href="${loginUrl}" 
                 style="background: #27ae60; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                Accéder à mon espace
              </a>
            </p>
            
            <h3 style="color: #3498db; margin-top: 40px;">Prochaines étapes</h3>
            
            <ol style="line-height: 2;">
              <li>Connectez-vous avec vos identifiants</li>
              <li>Changez votre mot de passe temporaire</li>
              <li>Complétez le profil de votre organisation</li>
              <li>Ajoutez vos collaborateurs</li>
              <li>Configurez vos préférences</li>
            </ol>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <div style="text-align: center; color: #7f8c8d; font-size: 14px;">
            <p><strong>${organisation.nom}</strong></p>
            <p>${organisation.email_contact} | ${organisation.telephone || ''}</p>
            <p style="font-size: 12px; margin-top: 20px;">
              Cet email contient des informations confidentielles.<br>
              Si vous l'avez reçu par erreur, veuillez le supprimer.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Décrypter le mot de passe SMTP (si chiffré)
   * 
   * ⚠️ En production, implémenter un vrai chiffrement (AES-256)
   */
  private decryptPassword(encryptedPassword: string): string {
    // TODO: Implémenter le déchiffrement en production
    // Pour l'instant, on suppose que c'est en clair (développement seulement)
    return encryptedPassword;
  }

  /**
   * Tester la configuration SMTP d'une organisation
   */
  async testSmtpConfiguration(organisation: Organisation): Promise<boolean> {
    try {
      const transporter = this.getTransporterForOrganisation(organisation);
      await transporter.verify();
      
      this.logger.log(`✅ Configuration SMTP valide pour: ${organisation.nom}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Configuration SMTP invalide pour ${organisation.nom}:`, error);
      return false;
    }
  }

  /**
   * Nettoyer le cache des transporters (appelé lors de l'arrêt ou mise à jour)
   */
  clearTransporterCache(organisationId?: number) {
    if (organisationId) {
      this.organisationTransporters.delete(organisationId);
      this.logger.log(`Cache transporter vidé pour organisation ID: ${organisationId}`);
    } else {
      this.organisationTransporters.clear();
      this.logger.log(`Cache transporters vidé complètement`);
    }
  }
}

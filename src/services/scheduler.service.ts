import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { KeycloakService } from '../auth/keycloak.service';
import { EmailService } from './email.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    private keycloakService: KeycloakService,
    private emailService: EmailService,
  ) {}

  /**
   * Nettoie les comptes désactivés depuis plus de 7 jours
   * TODO: Ajouter @Cron('0 2 * * *') quand @nestjs/schedule sera configuré
   */
  async cleanupDeactivatedAccounts() {
    this.logger.log('Début du nettoyage des comptes désactivés...');

    try {
      // Calculer la date limite (7 jours avant aujourd'hui)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Trouver tous les personnels désactivés depuis plus de 7 jours
      const personnelsToDelete = await this.personnelRepository.find({
        where: [
          {
            statut: 'inactif',
            updated_at: LessThan(sevenDaysAgo),
          },
          {
            statut: 'desactive',
            updated_at: LessThan(sevenDaysAgo),
          }
        ],
      });

      this.logger.log(`${personnelsToDelete.length} comptes à supprimer trouvés`);

      for (const personnel of personnelsToDelete) {
        try {
          // Supprimer de Keycloak si l'ID Keycloak existe
          if (personnel.keycloak_id) {
            await this.keycloakService.deleteUser(personnel.keycloak_id);
            this.logger.log(`Utilisateur ${personnel.nom_utilisateur} supprimé de Keycloak`);
          }

          // Envoyer un email de notification de suppression définitive
          if (personnel.email) {
            await this.sendDeletionNotificationEmail(personnel);
          }

          // Supprimer de la base de données locale
          await this.personnelRepository.remove(personnel);
          
          this.logger.log(`Personnel ${personnel.nom_utilisateur} (ID: ${personnel.id}) supprimé définitivement`);
        } catch (error) {
          this.logger.error(`Erreur lors de la suppression du personnel ${personnel.nom_utilisateur}: ${error.message}`);
        }
      }

      this.logger.log(`Nettoyage terminé: ${personnelsToDelete.length} comptes supprimés`);
    } catch (error) {
      this.logger.error(`Erreur lors du nettoyage des comptes désactivés: ${error.message}`);
    }
  }

  /**
   * Envoie des rappels aux personnels qui seront supprimés dans 2 jours
   * TODO: Ajouter @Cron('0 8 * * *') quand @nestjs/schedule sera configuré
   */
  async sendDeletionWarnings() {
    this.logger.log('Début de l\'envoi des avertissements de suppression...');

    try {
      // Calculer la date limite (5 jours avant aujourd'hui = 2 jours avant suppression)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      // Trouver tous les personnels désactivés il y a exactement 5 jours
      const personnelsToWarn = await this.personnelRepository.createQueryBuilder('personnel')
        .where('personnel.statut IN (:...statuts)', { statuts: ['inactif', 'desactive'] })
        .andWhere('personnel.updated_at >= :start', { start: sixDaysAgo })
        .andWhere('personnel.updated_at < :end', { end: fiveDaysAgo })
        .getMany();

      this.logger.log(`${personnelsToWarn.length} personnels à avertir trouvés`);

      for (const personnel of personnelsToWarn) {
        try {
          if (personnel.email) {
            await this.sendDeletionWarningEmail(personnel);
            this.logger.log(`Avertissement envoyé à ${personnel.nom_utilisateur}`);
          }
        } catch (error) {
          this.logger.error(`Erreur lors de l'envoi de l'avertissement à ${personnel.nom_utilisateur}: ${error.message}`);
        }
      }

      this.logger.log(`Envoi des avertissements terminé: ${personnelsToWarn.length} emails envoyés`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi des avertissements: ${error.message}`);
    }
  }

  /**
   * Envoie un email d'avertissement 2 jours avant la suppression définitive
   */
  private async sendDeletionWarningEmail(personnel: Personnel): Promise<void> {
    const subject = '⚠️ Suppression définitive de votre compte dans 2 jours - ERP Velosi';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b35; margin: 0;">⚠️ Avertissement Important</h1>
          <p style="color: #666; font-size: 16px; margin: 10px 0;">Suppression définitive de votre compte</p>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <h2 style="color: #856404; margin: 0 0 15px 0;">Votre compte sera supprimé définitivement dans 2 jours</h2>
          <p style="color: #856404; margin: 0;">
            Votre compte utilisateur sera automatiquement supprimé de tous nos systèmes (base de données et Keycloak) 
            dans exactement 2 jours si aucune action n'est entreprise.
          </p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Informations de votre compte :</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li><strong>Nom :</strong> ${personnel.prenom} ${personnel.nom}</li>
            <li><strong>Nom d'utilisateur :</strong> ${personnel.nom_utilisateur}</li>
            <li><strong>Rôle :</strong> ${personnel.role}</li>
            <li><strong>Statut actuel :</strong> ${personnel.statut}</li>
            <li><strong>Date de désactivation :</strong> ${personnel.updated_at.toLocaleDateString('fr-FR')}</li>
          </ul>
        </div>

        <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
          <h4 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ Action requise</h4>
          <p style="color: #333; margin: 0;">
            Si vous souhaitez conserver votre accès, veuillez contacter immédiatement votre administrateur système 
            pour demander la réactivation de votre compte.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #999; font-size: 14px;">
            Cet email a été envoyé automatiquement par le système ERP Velosi.<br>
            Si vous avez des questions, contactez votre administrateur.
          </p>
        </div>
      </div>
    `;

    try {
      await this.emailService.sendEmail(personnel.email, subject, htmlContent);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email d'avertissement à ${personnel.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envoie un email de notification de suppression définitive
   */
  private async sendDeletionNotificationEmail(personnel: Personnel): Promise<void> {
    const subject = '🗑️ Votre compte a été supprimé définitivement - ERP Velosi';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin: 0;">🗑️ Compte Supprimé</h1>
          <p style="color: #666; font-size: 16px; margin: 10px 0;">Suppression définitive effectuée</p>
        </div>

        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <h2 style="color: #721c24; margin: 0 0 15px 0;">Votre compte a été supprimé définitivement</h2>
          <p style="color: #721c24; margin: 0;">
            Conformément à notre politique de sécurité, votre compte utilisateur a été supprimé définitivement 
            de tous nos systèmes après 7 jours de désactivation.
          </p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Informations du compte supprimé :</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li><strong>Nom :</strong> ${personnel.prenom} ${personnel.nom}</li>
            <li><strong>Nom d'utilisateur :</strong> ${personnel.nom_utilisateur}</li>
            <li><strong>Rôle :</strong> ${personnel.role}</li>
            <li><strong>Date de désactivation :</strong> ${personnel.updated_at.toLocaleDateString('fr-FR')}</li>
            <li><strong>Date de suppression :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
          </ul>
        </div>

        <div style="background-color: #d1ecf1; border-left: 4px solid #bee5eb; padding: 15px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0;">ℹ️ Information importante</h4>
          <p style="color: #0c5460; margin: 0;">
            Toutes vos données ont été supprimées de nos systèmes. Si vous avez besoin d'un nouvel accès, 
            veuillez contacter votre administrateur système qui devra créer un nouveau compte.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #999; font-size: 14px;">
            Cet email a été envoyé automatiquement par le système ERP Velosi.<br>
            Pour toute réclamation, contactez votre administrateur dans les plus brefs délais.
          </p>
        </div>
      </div>
    `;

    try {
      await this.emailService.sendEmail(personnel.email, subject, htmlContent);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email de suppression à ${personnel.email}: ${error.message}`);
      // Ne pas lancer l'erreur car la suppression doit continuer même si l'email échoue
    }
  }

  /**
   * Méthode manuelle pour nettoyer les comptes (pour tests ou usage administrateur)
   */
  async manualCleanup(): Promise<{ deleted: number; errors: string[] }> {
    this.logger.log('Nettoyage manuel déclenché...');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const personnelsToDelete = await this.personnelRepository.find({
      where: [
        {
          statut: 'inactif',
          updated_at: LessThan(sevenDaysAgo),
        },
        {
          statut: 'desactive',
          updated_at: LessThan(sevenDaysAgo),
        }
      ],
    });

    let deletedCount = 0;
    const errors: string[] = [];

    for (const personnel of personnelsToDelete) {
      try {
        if (personnel.keycloak_id) {
          await this.keycloakService.deleteUser(personnel.keycloak_id);
        }

        if (personnel.email) {
          await this.sendDeletionNotificationEmail(personnel);
        }

        await this.personnelRepository.remove(personnel);
        deletedCount++;
      } catch (error) {
        errors.push(`Erreur pour ${personnel.nom_utilisateur}: ${error.message}`);
      }
    }

    return { deleted: deletedCount, errors };
  }
}
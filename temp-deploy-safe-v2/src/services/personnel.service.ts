import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { KeycloakService } from '../auth/keycloak.service';

@Injectable()
export class PersonnelService {
  private readonly logger = new Logger(PersonnelService.name);

  constructor(
    @InjectRepository(Personnel)
    private readonly personnelRepository: Repository<Personnel>,
    private readonly keycloakService: KeycloakService,
  ) {}

  /**
   * Mettre à jour un personnel avec synchronisation Keycloak
   */
  async update(id: number, updateData: Partial<Personnel>): Promise<Personnel> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} non trouvé`);
    }

    // Mettre à jour les données locales
    Object.assign(personnel, updateData);
    const updatedPersonnel = await this.personnelRepository.save(personnel);

    // ✅ SYNCHRONISER AVEC KEYCLOAK
    if (personnel.keycloak_id && this.keycloakService) {
      try {
        // Mise à jour des informations dans Keycloak
        await this.keycloakService.updateUser(personnel.keycloak_id, {
          username: updatedPersonnel.nom_utilisateur,
          email: updatedPersonnel.email || '',
          firstName: updatedPersonnel.prenom,
          lastName: updatedPersonnel.nom,
          enabled: updatedPersonnel.statut === 'actif',
        });

        // Gestion du statut
        if (updateData.statut) {
          if (updateData.statut === 'actif') {
            await this.keycloakService.enableUser(personnel.keycloak_id);
            this.logger.log(`✅ Personnel #${id} activé dans Keycloak`);
          } else {
            await this.keycloakService.disableUser(personnel.keycloak_id);
            // Fermer toutes les sessions si désactivé
            await this.keycloakService.logoutAllUserSessions(personnel.keycloak_id);
            this.logger.log(`✅ Personnel #${id} désactivé dans Keycloak et sessions fermées`);
          }
        }

        // Gestion du changement de rôle
        if (updateData.role && updateData.role !== personnel.role) {
          await this.keycloakService.updateUserRole(personnel.keycloak_id, updateData.role);
          this.logger.log(`✅ Personnel #${id} - Rôle mis à jour dans Keycloak: ${updateData.role}`);
        }

        this.logger.log(`✅ Personnel #${id} synchronisé avec Keycloak`);
      } catch (keycloakError) {
        this.logger.warn(`⚠️ Erreur synchronisation Keycloak personnel #${id}: ${keycloakError.message}`);
      }
    }

    return updatedPersonnel;
  }

  /**
   * Supprimer un personnel avec suppression dans Keycloak
   */
  async delete(id: number): Promise<void> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} non trouvé`);
    }

    // ✅ SUPPRIMER DE KEYCLOAK
    if (personnel.keycloak_id && this.keycloakService) {
      try {
        await this.keycloakService.deleteUser(personnel.keycloak_id);
        this.logger.log(`✅ Personnel #${id} supprimé de Keycloak`);
      } catch (keycloakError) {
        this.logger.warn(`⚠️ Erreur suppression Keycloak personnel #${id}: ${keycloakError.message}`);
      }
    }

    // Supprimer de la base de données
    await this.personnelRepository.remove(personnel);
    this.logger.log(`✅ Personnel #${id} supprimé de la base de données`);
  }

  /**
   * Récupérer toutes les sessions actives d'un personnel
   */
  async getUserSessions(id: number): Promise<any[]> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} non trouvé`);
    }

    if (!personnel.keycloak_id) {
      this.logger.warn(`Personnel #${id} n'a pas de keycloak_id`);
      return [];
    }

    try {
      return await this.keycloakService.getUserSessions(personnel.keycloak_id);
    } catch (error) {
      this.logger.error(`Erreur récupération sessions personnel #${id}: ${error.message}`);
      return [];
    }
  }

  /**
   * Fermer toutes les sessions actives d'un personnel
   */
  async closeAllSessions(id: number): Promise<boolean> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} non trouvé`);
    }

    if (!personnel.keycloak_id) {
      this.logger.warn(`Personnel #${id} n'a pas de keycloak_id`);
      return false;
    }

    try {
      const result = await this.keycloakService.logoutAllUserSessions(personnel.keycloak_id);
      this.logger.log(`✅ Toutes les sessions du personnel #${id} ont été fermées`);
      return result;
    } catch (error) {
      this.logger.error(`Erreur fermeture sessions personnel #${id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Récupérer l'activité d'un personnel depuis Keycloak
   */
  async getUserActivity(id: number): Promise<any> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} non trouvé`);
    }

    if (!personnel.keycloak_id) {
      this.logger.warn(`Personnel #${id} n'a pas de keycloak_id`);
      return null;
    }

    try {
      return await this.keycloakService.getUserActivity(personnel.keycloak_id);
    } catch (error) {
      this.logger.error(`Erreur récupération activité personnel #${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupérer un personnel par ID
   */
  async findOne(id: number): Promise<Personnel> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} non trouvé`);
    }

    return personnel;
  }

  /**
   * Récupérer tous les personnels
   */
  async findAll(): Promise<Personnel[]> {
    return await this.personnelRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Activer un personnel
   */
  async activate(id: number): Promise<Personnel> {
    return await this.update(id, { statut: 'actif' });
  }

  /**
   * Désactiver un personnel
   */
  async deactivate(id: number): Promise<Personnel> {
    return await this.update(id, { statut: 'inactif' });
  }

  /**
   * Changer le rôle d'un personnel
   */
  async changeRole(id: number, newRole: string): Promise<Personnel> {
    return await this.update(id, { role: newRole });
  }
}

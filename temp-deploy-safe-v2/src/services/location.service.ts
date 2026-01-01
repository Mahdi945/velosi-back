import { Injectable, Scope, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { LocationUpdateDto } from '../dto/location-update.dto';
import { LocationGateway } from '../gateway/location.gateway';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class LocationService {
  constructor(
    private readonly databaseConnectionService: DatabaseConnectionService,
    private locationGateway: LocationGateway,
  ) {}

  /**
   * Obtenir les repositories dynamiques pour une base de données
   */
  private async getRepositories(databaseName: string) {
    const dataSource = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    return {
      personnelRepository: dataSource.getRepository(Personnel),
    };
  }

  /**
   * Met à jour la position GPS d'un personnel
   */
  async updatePersonnelLocation(
    personnelId: number,
    locationData: LocationUpdateDto,
    databaseName: string,
    organisationId: number,
  ): Promise<Personnel> {
    console.log(`🏢 [updatePersonnelLocation] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    const personnel = await personnelRepository.findOne({
      where: { id: personnelId, statut: 'actif' },
    });

    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé ou inactif');
    }

    if (!personnel.location_tracking_enabled) {
      throw new BadRequestException('Le suivi GPS n\'est pas activé pour ce personnel');
    }

    // Validation des coordonnées GPS
    this.validateCoordinates(locationData.latitude, locationData.longitude);

    // Mettre à jour les informations de localisation
    personnel.latitude = locationData.latitude;
    personnel.longitude = locationData.longitude;
    personnel.last_location_update = new Date();
    personnel.location_accuracy = locationData.accuracy || null;
    personnel.location_source = locationData.source || 'unknown';
    personnel.is_location_active = true;

    const updatedPersonnel = await personnelRepository.save(personnel);

    // Diffuser la mise à jour en temps réel via WebSocket
    await this.locationGateway.broadcastLocationUpdate({
      personnelId: personnel.id,
      nom: personnel.nom,
      prenom: personnel.prenom,
      role: personnel.role,
      latitude: personnel.latitude,
      longitude: personnel.longitude,
      accuracy: personnel.location_accuracy,
      source: personnel.location_source,
      timestamp: personnel.last_location_update,
      isActive: personnel.is_location_active,
    });

    return updatedPersonnel;
  }

  /**
   * Active/désactive le suivi GPS pour un personnel
   */
  async toggleLocationTracking(
    personnelId: number,
    enabled: boolean,
    databaseName: string,
    organisationId: number,
  ): Promise<Personnel> {
    console.log(`🏢 [toggleLocationTracking] DB: ${databaseName}, Org: ${organisationId}`);
    console.log(`🔄 Toggle GPS tracking pour personnel ${personnelId}: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    
    const personnel = await personnelRepository.findOne({
      where: { id: personnelId },
    });

    if (!personnel) {
      throw new NotFoundException(`Personnel avec ID ${personnelId} non trouvé`);
    }

    // Log l'état avant modification
    console.log(`📊 État avant modification:`, {
      location_tracking_enabled: personnel.location_tracking_enabled,
      is_location_active: personnel.is_location_active,
      latitude: personnel.latitude,
      longitude: personnel.longitude
    });

    personnel.location_tracking_enabled = enabled;
    
    if (!enabled) {
      // Si on désactive le tracking, on marque la position comme inactive
      personnel.is_location_active = false;
      console.log('❌ Tracking GPS désactivé - is_location_active mis à false');
    } else {
      // Si on active le tracking, is_location_active sera mis à true lors de la première position reçue
      console.log('✅ Tracking GPS activé - is_location_active sera activé lors de la prochaine position');
    }

    const updatedPersonnel = await personnelRepository.save(personnel);

    // Log l'état après modification
    console.log(`📊 État après modification:`, {
      location_tracking_enabled: updatedPersonnel.location_tracking_enabled,
      is_location_active: updatedPersonnel.is_location_active,
      latitude: updatedPersonnel.latitude,
      longitude: updatedPersonnel.longitude
    });

    // Notifier le changement de statut via WebSocket
    await this.locationGateway.broadcastTrackingStatusUpdate({
      personnelId: personnel.id,
      nom: personnel.nom,
      prenom: personnel.prenom,
      trackingEnabled: enabled,
    });

    console.log(`✅ Toggle GPS terminé pour ${personnel.prenom} ${personnel.nom}`);
    return updatedPersonnel;
  }

  /**
   * Récupère tous les personnels avec leur position
   */
  async getAllPersonnelWithLocation(
    databaseName: string,
    organisationId: number,
  ): Promise<Personnel[]> {
    console.log(`🏢 [getAllPersonnelWithLocation] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    return personnelRepository.find({
      where: { 
        statut: 'actif',
        location_tracking_enabled: true,
      },
      select: [
        'id', 'nom', 'prenom', 'role', 'telephone',
        'latitude', 'longitude', 'last_location_update',
        'location_accuracy', 'location_source', 'is_location_active',
        'location_tracking_enabled'
      ],
      order: { last_location_update: 'DESC' },
    });
  }

  /**
   * Récupère les personnels actifs avec position récente
   */
  async getActivePersonnelWithRecentLocation(
    databaseName: string,
    organisationId: number,
  ): Promise<Personnel[]> {
    console.log(`🏢 [getActivePersonnelWithRecentLocation] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return personnelRepository
      .createQueryBuilder('personnel')
      .where('personnel.statut = :statut', { statut: 'actif' })
      .andWhere('personnel.location_tracking_enabled = :enabled', { enabled: true })
      .andWhere('personnel.is_location_active = :active', { active: true })
      .andWhere('personnel.last_location_update > :fiveMinutesAgo', { fiveMinutesAgo })
      .andWhere('personnel.latitude IS NOT NULL')
      .andWhere('personnel.longitude IS NOT NULL')
      .select([
        'personnel.id', 'personnel.nom', 'personnel.prenom', 'personnel.role',
        'personnel.latitude', 'personnel.longitude', 'personnel.last_location_update',
        'personnel.location_accuracy', 'personnel.location_source', 'personnel.is_location_active'
      ])
      .orderBy('personnel.last_location_update', 'DESC')
      .getMany();
  }

  /**
   * Recherche du personnel par proximité géographique
   */
  async findPersonnelNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    databaseName: string,
    organisationId: number,
  ): Promise<Array<Personnel & { distance: number }>> {
    console.log(`🏢 [findPersonnelNearby] DB: ${databaseName}, Org: ${organisationId}`);
    this.validateCoordinates(latitude, longitude);

    const personnelList = await this.getActivePersonnelWithRecentLocation(databaseName, organisationId);
    
    const nearbyPersonnel = personnelList
      .map(personnel => {
        const distance = personnel.distanceTo(latitude, longitude) || 999999;
        return Object.assign(personnel, { distance });
      })
      .filter(item => item.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return nearbyPersonnel as Array<Personnel & { distance: number }>;
  }

  /**
   * Marque les positions inactives (plus de 5 minutes)
   */
  async markInactiveLocations(
    databaseName: string,
    organisationId: number,
  ): Promise<void> {
    console.log(`🏢 [markInactiveLocations] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    await personnelRepository
      .createQueryBuilder()
      .update(Personnel)
      .set({ is_location_active: false })
      .where('is_location_active = :active', { active: true })
      .andWhere('last_location_update < :fiveMinutesAgo', { fiveMinutesAgo })
      .execute();
  }

  /**
   * Obtient les statistiques de géolocalisation
   */
  async getLocationStats(
    databaseName: string,
    organisationId: number,
  ): Promise<{
    totalPersonnel: number;
    trackingEnabled: number;
    currentlyActive: number;
    withPosition: number;
    lastHourUpdates: number;
  }> {
    console.log(`🏢 [getLocationStats] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [total, tracking, active, withPos, recent] = await Promise.all([
      personnelRepository.count({ where: { statut: 'actif' } }),
      personnelRepository.count({ 
        where: { statut: 'actif', location_tracking_enabled: true } 
      }),
      personnelRepository.count({ 
        where: { statut: 'actif', is_location_active: true } 
      }),
      personnelRepository
        .createQueryBuilder('personnel')
        .where('personnel.statut = :statut', { statut: 'actif' })
        .andWhere('personnel.latitude IS NOT NULL')
        .andWhere('personnel.longitude IS NOT NULL')
        .getCount(),
      personnelRepository
        .createQueryBuilder('personnel')
        .where('personnel.statut = :statut', { statut: 'actif' })
        .andWhere('personnel.last_location_update > :oneHourAgo', { oneHourAgo })
        .getCount(),
    ]);

    return {
      totalPersonnel: total,
      trackingEnabled: tracking,
      currentlyActive: active,
      withPosition: withPos,
      lastHourUpdates: recent,
    };
  }

  /**
   * Valide les coordonnées GPS
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude invalide (doit être entre -90 et 90)');
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude invalide (doit être entre -180 et 180)');
    }
  }

  /**
   * Trouve un personnel par son ID
   */
  async findPersonnelById(
    personnelId: number,
    databaseName: string,
    organisationId: number,
  ): Promise<Personnel | null> {
    console.log(`🏢 [findPersonnelById] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    return await personnelRepository.findOne({
      where: { id: personnelId },
      select: [
        'id', 'nom', 'prenom', 'role',
        'latitude', 'longitude', 'last_location_update',
        'location_accuracy', 'location_source',
        'is_location_active', 'location_tracking_enabled'
      ]
    });
  }

  /**
   * Nettoie les anciennes positions (plus de 24h)
   */
  async cleanupOldLocations(
    databaseName: string,
    organisationId: number,
  ): Promise<void> {
    console.log(`🏢 [cleanupOldLocations] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    await personnelRepository
      .createQueryBuilder()
      .update(Personnel)
      .set({ 
        latitude: null,
        longitude: null,
        location_accuracy: null,
        is_location_active: false,
      })
      .where('last_location_update < :twentyFourHoursAgo', { twentyFourHoursAgo })
      .andWhere('location_tracking_enabled = :enabled', { enabled: false })
      .execute();
  }
}
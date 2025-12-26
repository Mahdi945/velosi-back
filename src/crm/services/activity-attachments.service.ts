import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectionService } from '../../common/database-connection.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface AttachmentMetadata {
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

@Injectable()
export class ActivityAttachmentsService {
  private readonly baseUploadPath = './uploads/activites';

  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Parser JSON de manière sécurisée
   */
  private parseJsonSafely(jsonString: any): any[] {
    if (!jsonString) {
      return [];
    }
    
    // Si c'est déjà un array, le retourner directement
    if (Array.isArray(jsonString)) {
      return jsonString;
    }
    
    // Si c'est une chaîne vide ou invalide
    if (typeof jsonString === 'string') {
      const trimmed = jsonString.trim();
      if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
        return [];
      }
      
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('Erreur lors du parsing JSON des attachments:', error.message);
        return [];
      }
    }
    
    return [];
  }

  /**
   * Créer le dossier pour une activité
   */
  async createActivityFolder(activityId: number): Promise<string> {
    const activityPath = path.join(this.baseUploadPath, activityId.toString());

    if (!existsSync(activityPath)) {
      await fs.mkdir(activityPath, { recursive: true });
    }

    return activityPath;
  }

  /**
   * Déplacer les fichiers temporaires vers le dossier de l'activité
   */
  async moveFilesToActivityFolder(
    activityId: number,
    tempFiles: Express.Multer.File[],
  ): Promise<AttachmentMetadata[]> {
    const activityPath = await this.createActivityFolder(activityId);
    const attachments: AttachmentMetadata[] = [];

    for (const file of tempFiles) {
      const destPath = path.join(activityPath, file.filename);

      // Déplacer le fichier
      await fs.rename(file.path, destPath);

      // Créer les métadonnées
      attachments.push({
        fileName: file.filename,
        originalName: file.originalname,
        filePath: `activites/${activityId}/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      });
    }

    return attachments;
  }

  /**
   * Ajouter des attachments à une activité
   */
  async addAttachments(
    activityId: number,
    files: Express.Multer.File[],
    databaseName: string,
  ): Promise<AttachmentMetadata[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier que l'activité existe
    const activities = await connection.query(
      'SELECT id, attachments FROM crm_activities WHERE id = $1',
      [activityId]
    );

    if (!activities || activities.length === 0) {
      // Nettoyer les fichiers temporaires
      await this.cleanupTempFiles(files);
      throw new NotFoundException(`Activité ${activityId} non trouvée`);
    }

    // Déplacer les fichiers
    const newAttachments = await this.moveFilesToActivityFolder(
      activityId,
      files,
    );

    // Mettre à jour l'activité
    const existingAttachments = this.parseJsonSafely(activities[0].attachments);
    const updatedAttachments = [...existingAttachments, ...newAttachments];

    await connection.query(
      'UPDATE crm_activities SET attachments = $1 WHERE id = $2',
      [JSON.stringify(updatedAttachments), activityId]
    );

    return newAttachments;
  }

  /**
   * Supprimer un attachment
   */
  async deleteAttachment(
    activityId: number,
    fileName: string,
    databaseName: string,
  ): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Récupérer l'activité
    const activities = await connection.query(
      'SELECT id, attachments FROM crm_activities WHERE id = $1',
      [activityId]
    );

    if (!activities || activities.length === 0) {
      throw new NotFoundException(`Activité ${activityId} non trouvée`);
    }

    const attachments = this.parseJsonSafely(activities[0].attachments);

    // Trouver l'attachment
    const attachment = attachments.find(
      (a: AttachmentMetadata) => a.fileName === fileName,
    );

    if (!attachment) {
      throw new NotFoundException(`Fichier ${fileName} non trouvé`);
    }

    // Supprimer le fichier physique
    const filePath = path.join(this.baseUploadPath, activityId.toString(), fileName);
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier ${filePath}:`, error);
    }

    // Retirer des métadonnées
    const updatedAttachments = attachments.filter(
      (a: AttachmentMetadata) => a.fileName !== fileName,
    );

    await connection.query(
      'UPDATE crm_activities SET attachments = $1 WHERE id = $2',
      [JSON.stringify(updatedAttachments), activityId]
    );
  }

  /**
   * Obtenir le chemin complet d'un fichier
   */
  getFilePath(activityId: number, fileName: string): string {
    return path.join(this.baseUploadPath, activityId.toString(), fileName);
  }

  /**
   * Vérifier si un fichier existe
   */
  fileExists(activityId: number, fileName: string): boolean {
    const filePath = this.getFilePath(activityId, fileName);
    return existsSync(filePath);
  }

  /**
   * Nettoyer les fichiers temporaires
   */
  private async cleanupTempFiles(files: Express.Multer.File[]): Promise<void> {
    for (const file of files) {
      try {
        if (existsSync(file.path)) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        console.error(`Erreur lors du nettoyage de ${file.path}:`, error);
      }
    }
  }

  /**
   * Supprimer tous les fichiers d'une activité
   */
  async deleteAllActivityAttachments(activityId: number): Promise<void> {
    const activityPath = path.join(this.baseUploadPath, activityId.toString());

    try {
      if (existsSync(activityPath)) {
        await fs.rm(activityPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(
        `Erreur lors de la suppression du dossier ${activityPath}:`,
        error,
      );
    }
  }
}


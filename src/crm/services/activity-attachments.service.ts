import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../entities/activity.entity';
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
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
  ) {}

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
  ): Promise<AttachmentMetadata[]> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });

    if (!activity) {
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
    const existingAttachments = activity.attachments || [];
    activity.attachments = [...existingAttachments, ...newAttachments];

    await this.activityRepository.save(activity);

    return newAttachments;
  }

  /**
   * Supprimer un attachment
   */
  async deleteAttachment(
    activityId: number,
    fileName: string,
  ): Promise<void> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`Activité ${activityId} non trouvée`);
    }

    // Trouver l'attachment
    const attachment = activity.attachments?.find(
      (a) => a.fileName === fileName,
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
    activity.attachments = activity.attachments.filter(
      (a) => a.fileName !== fileName,
    );

    await this.activityRepository.save(activity);
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

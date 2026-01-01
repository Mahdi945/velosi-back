import { Column, DeleteDateColumn } from 'typeorm';

/**
 * Classe de base pour les entités avec soft delete
 * Utilisée pour les entités critiques du CRM (Lead, Opportunity, Quote)
 * qui ne doivent jamais être supprimées physiquement
 */
export abstract class BaseEntityWithSoftDelete {
  /**
   * Date de suppression (soft delete)
   * Null = actif, Date = supprimé/archivé
   */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  /**
   * Indicateur d'archivage manuel
   * Permet de distinguer archive volontaire vs suppression
   */
  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  /**
   * Raison de l'archivage ou suppression
   * Utile pour l'audit et l'analyse
   */
  @Column({ name: 'archived_reason', type: 'text', nullable: true })
  archivedReason: string;

  /**
   * ID de l'utilisateur qui a archivé/supprimé
   */
  @Column({ name: 'archived_by', nullable: true })
  archivedBy: number;
}

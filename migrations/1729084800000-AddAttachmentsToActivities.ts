import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentsToActivities1729084800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter colonne attachments en JSON pour stocker les métadonnées des fichiers
    await queryRunner.query(`
      ALTER TABLE "crm_activities" 
      ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb
    `);

    // Ajouter un commentaire pour documenter la structure
    await queryRunner.query(`
      COMMENT ON COLUMN "crm_activities"."attachments" IS 
      'Tableau JSON contenant les métadonnées des fichiers joints: [{fileName, originalName, filePath, fileSize, mimeType, uploadedAt}]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "crm_activities" 
      DROP COLUMN "attachments"
    `);
  }
}
